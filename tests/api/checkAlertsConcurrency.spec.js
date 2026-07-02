import { beforeEach, describe, expect, it, vi } from "vitest";

// Covers the bounded-concurrency rework of api/check_alerts.js:
//   (a) a slow account_event alert no longer starves subsequent alerts — the
//       account_event branch runs through a width-4 worker pool;
//   (b) multiple account_event alerts tracking the same address share ONE
//       indexer fetch per cron run (per-address memo), while emails and row
//       updates stay per-alert;
//   (c) consensus alerts keep their serial in-order evaluation and are not
//       blocked by hung account_event fetches.

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

const MAINNET_MAGIC = 860833102;

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function createDeferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function waitUntil(predicate, { timeout = 5000, interval = 5 } = {}) {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error("waitUntil timed out");
    }
    await new Promise((r) => setTimeout(r, interval));
  }
}

// Supabase double for the check_alerts read/update shape:
//   from('network_alerts').select('*').eq('network', n).eq('is_active', true)
//   from('network_alerts').update(payload).eq('id', id)
function createSupabaseMock(alerts) {
  const updates = [];
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(async () => ({ data: alerts, error: null })),
      })),
    })),
    update: vi.fn((payload) => ({
      eq: vi.fn(async (_column, id) => {
        updates.push({ id, payload });
        return { data: null, error: null };
      }),
    })),
  }));
  return { supabase: { from }, updates };
}

// Global fetch stub covering every upstream check_alerts touches: the JSON-RPC
// node (via callWithRpcEndpointFallback, incl. the getversion network probe),
// the indexer's REST /accounts/<addr>/transactions endpoint, and Resend.
// accountResponder(addr) controls each per-address fetch (gate it on a
// deferred to simulate a degraded indexer).
function stubUpstreams({ blockCount, blockPrimary, validators = [], accountResponder }) {
  const rpcMethodCalls = [];
  const accountFetches = [];
  const resendCalls = [];
  let inFlight = 0;
  let maxInFlight = 0;

  vi.stubGlobal("fetch", vi.fn(async (url, init = {}) => {
    const urlStr = String(url);

    if (urlStr.includes("api.resend.com")) {
      resendCalls.push(JSON.parse(String(init.body || "{}")));
      return jsonResponse({ id: `email-${resendCalls.length}` });
    }

    const accountMatch = urlStr.match(/\/accounts\/([^/]+)\/transactions/);
    if (accountMatch) {
      const addr = decodeURIComponent(accountMatch[1]);
      accountFetches.push(addr);
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      try {
        const tx = await accountResponder(addr);
        return jsonResponse({ data: tx ? [tx] : [] });
      } finally {
        inFlight -= 1;
      }
    }

    const body = JSON.parse(String(init.body || "{}"));
    rpcMethodCalls.push(body.method);
    if (body.method === "getversion") {
      return jsonResponse({ jsonrpc: "2.0", id: body.id, result: { protocol: { network: MAINNET_MAGIC } } });
    }
    if (body.method === "getblockcount") {
      return jsonResponse({ jsonrpc: "2.0", id: body.id, result: blockCount });
    }
    if (body.method === "getblock") {
      return jsonResponse({
        jsonrpc: "2.0",
        id: body.id,
        result: { index: blockCount - 1, primary: blockPrimary, time: Date.now() },
      });
    }
    if (body.method === "getnextblockvalidators") {
      return jsonResponse({ jsonrpc: "2.0", id: body.id, result: validators });
    }
    throw new Error(`unexpected RPC method: ${body.method}`);
  }));

  return {
    rpcMethodCalls,
    accountFetches,
    resendCalls,
    getMaxInFlight: () => maxInFlight,
  };
}

function accountAlert(id, address, lastSeenState = "") {
  return {
    id,
    network: "mainnet",
    alert_type: "account_event",
    target: address,
    threshold: 0,
    contact: `${id}@example.com`,
    last_seen_state: lastSeenState,
    is_active: true,
  };
}

async function loadCheckAlerts(supabase) {
  const mod = await import("../../api/check_alerts.js");
  const handler = mod.default || mod;
  handler._internal.setSupabaseClientForTests(supabase);
  return handler;
}

describe("check_alerts bounded concurrency", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("evaluates account_event alerts through a width-4 pool so one slow alert cannot starve the rest", async () => {
    const alerts = Array.from({ length: 6 }, (_, i) => accountAlert(`acct-${i}`, `addr-${i}`));
    const { supabase, updates } = createSupabaseMock(alerts);

    const gates = new Map(alerts.map((a) => [a.target, createDeferred()]));
    const upstream = stubUpstreams({
      blockCount: 1000,
      blockPrimary: 0,
      accountResponder: (addr) => gates.get(addr).promise,
    });

    const handler = await loadCheckAlerts(supabase);
    const runPromise = handler._internal.checkNetworkAlerts("mainnet");

    // The pool must open exactly 4 concurrent fetches (width bound), not 6
    // (unbounded) and not 1 (serial).
    await waitUntil(() => upstream.accountFetches.length === 4);
    await new Promise((r) => setTimeout(r, 25));
    expect(upstream.accountFetches).toEqual(["addr-0", "addr-1", "addr-2", "addr-3"]);
    expect(upstream.getMaxInFlight()).toBe(4);
    expect(updates).toHaveLength(0);

    // addr-0 stays hung (degraded indexer); the other three first-wave alerts
    // complete. Subsequent alerts (addr-4, addr-5) must still be picked up
    // and finish while addr-0 is stuck — the old serial loop stopped here.
    gates.get("addr-1").resolve({ txid: "tx-1" });
    gates.get("addr-2").resolve({ txid: "tx-2" });
    gates.get("addr-3").resolve({ txid: "tx-3" });

    await waitUntil(() => updates.length === 3 && upstream.accountFetches.length === 6);
    expect(upstream.accountFetches.slice(4)).toEqual(["addr-4", "addr-5"]);
    gates.get("addr-4").resolve({ txid: "tx-4" });
    gates.get("addr-5").resolve({ txid: "tx-5" });
    await waitUntil(() => updates.length === 5);

    const doneIds = updates.map((u) => u.id).sort();
    expect(doneIds).toEqual(["acct-1", "acct-2", "acct-3", "acct-4", "acct-5"]);
    expect(doneIds).not.toContain("acct-0");

    gates.get("addr-0").resolve({ txid: "tx-0" });
    await expect(runPromise).resolves.toBe(0);

    expect(updates).toHaveLength(6);
    const byId = Object.fromEntries(updates.map((u) => [u.id, u.payload]));
    expect(byId["acct-0"]).toEqual({ last_seen_state: "tx-0" });
    expect(byId["acct-5"]).toEqual({ last_seen_state: "tx-5" });
  });

  it("dedups indexer fetches per address within a run while keeping emails and row updates per-alert", async () => {
    // Two alerts track the same address; a third tracks another address.
    // Both shared-address alerts have a stale last_seen_state, so both
    // trigger — from ONE fetch — and each sends its own email.
    vi.stubEnv("RESEND_API_KEY", "test-resend-key");
    vi.stubEnv("ALERT_EMAIL_FROM", "alerts@example.com");

    const alerts = [
      accountAlert("acct-a1", "shared-addr", "old-hash"),
      accountAlert("acct-a2", "shared-addr", "old-hash"),
      accountAlert("acct-b1", "other-addr", "old-hash"),
    ];
    const { supabase, updates } = createSupabaseMock(alerts);

    const txByAddr = {
      "shared-addr": { txid: "tx-shared" },
      "other-addr": { txid: "tx-other" },
    };
    const upstream = stubUpstreams({
      blockCount: 1000,
      blockPrimary: 0,
      accountResponder: (addr) => Promise.resolve(txByAddr[addr]),
    });

    const handler = await loadCheckAlerts(supabase);
    await expect(handler._internal.checkNetworkAlerts("mainnet")).resolves.toBe(3);

    // One fetch per distinct address, NOT one per alert.
    expect(upstream.accountFetches).toHaveLength(2);
    expect([...upstream.accountFetches].sort()).toEqual(["other-addr", "shared-addr"]);

    // Once-per-alert emails preserved: three alerts, three sends.
    expect(upstream.resendCalls).toHaveLength(3);
    expect(upstream.resendCalls.map((c) => c.to).sort()).toEqual([
      "acct-a1@example.com",
      "acct-a2@example.com",
      "acct-b1@example.com",
    ]);

    // Per-row UPDATEs preserved: each alert persists its own state row.
    expect(updates).toHaveLength(3);
    const byId = Object.fromEntries(updates.map((u) => [u.id, u.payload]));
    expect(byId["acct-a1"]).toEqual({ last_seen_state: "tx-shared", is_active: false });
    expect(byId["acct-a2"]).toEqual({ last_seen_state: "tx-shared", is_active: false });
    expect(byId["acct-b1"]).toEqual({ last_seen_state: "tx-other", is_active: false });
  });

  it("keeps consensus alerts serial, in order, and unaffected by hung account_event fetches", async () => {
    const blockCount = 10900514; // latest block 10900513, expected primary 10900513 % 7 === 1
    const validators = Array.from({ length: 7 }, (_, i) => ({ publickey: `validator-${i}` }));
    const alerts = [
      // Account alert listed FIRST so the old serial loop would have blocked
      // on it before ever reaching the consensus alerts below.
      accountAlert("acct-slow", "slow-addr"),
      {
        id: "cons-1",
        network: "mainnet",
        alert_type: "consensus_missed",
        target: "validator-2",
        threshold: 5,
        miss_count: 4,
        last_seen_state: "10900512",
        contact: "ops@example.com",
        is_active: true,
      },
      {
        id: "cons-2",
        network: "mainnet",
        alert_type: "consensus_missed",
        target: "validator-5",
        threshold: 5,
        miss_count: 2,
        last_seen_state: "10900512",
        contact: "ops@example.com",
        is_active: true,
      },
    ];
    const { supabase, updates } = createSupabaseMock(alerts);

    const slowGate = createDeferred();
    const upstream = stubUpstreams({
      blockCount,
      blockPrimary: 1,
      validators,
      accountResponder: () => slowGate.promise,
    });

    const handler = await loadCheckAlerts(supabase);
    const runPromise = handler._internal.checkNetworkAlerts("mainnet");

    // Both consensus alerts complete their read-modify-write while the
    // account fetch is still hung, in their original list order.
    await waitUntil(() => updates.length === 2);
    expect(updates).toEqual([
      { id: "cons-1", payload: { last_seen_state: "10900513", miss_count: 4 } },
      { id: "cons-2", payload: { last_seen_state: "10900513", miss_count: 2 } },
    ]);

    // The shared validator set is fetched exactly once for the serial pass.
    expect(upstream.rpcMethodCalls.filter((m) => m === "getnextblockvalidators")).toHaveLength(1);

    slowGate.resolve({ txid: "tx-slow" });
    await expect(runPromise).resolves.toBe(0);

    expect(updates).toHaveLength(3);
    expect(updates[2]).toEqual({ id: "acct-slow", payload: { last_seen_state: "tx-slow" } });
  });
});
