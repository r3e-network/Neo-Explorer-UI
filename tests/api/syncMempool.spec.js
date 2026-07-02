import { beforeEach, describe, expect, it, vi } from "vitest";

// Route every RPC through a deterministic per-network stub URL so the global
// fetch stub can dispatch on network without real endpoint fallback logic.
vi.mock("../../api/lib/rpcEndpoints.js", () => ({
  callWithRpcEndpointFallback: vi.fn(async (network, attempt) =>
    attempt(`https://rpc.test/${network}`)),
}));

function createMockRes() {
  const headers = {};
  let body = "";

  return {
    headers,
    statusCode: 200,
    setHeader(name, value) {
      headers[name] = value;
    },
    end(chunk = "") {
      body += chunk;
    },
    getBody() {
      return body;
    },
  };
}

// Supabase double covering the four chains sync_mempool uses per network:
// select('hash').eq(..), upsert(..), delete().eq(..).in(..), delete().eq(..).lt(..).
// Stored hashes are network-scoped, mirroring the real per-network rows.
function createSyncSupabaseMock({ storedHashesByNetwork = {} } = {}) {
  const calls = { upserts: [], deleteIn: [], deleteLt: [] };
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(async (_col, network) => ({
        data: (storedHashesByNetwork[network] || []).map((hash) => ({ hash })),
        error: null,
      })),
    })),
    upsert: vi.fn(async (records, options) => {
      calls.upserts.push({ records, options });
      return { data: null, error: null };
    }),
    delete: vi.fn(() => ({
      eq: vi.fn((_col, network) => ({
        in: vi.fn(async (_hashCol, hashes) => {
          calls.deleteIn.push({ network, hashes });
          return { data: null, error: null };
        }),
        lt: vi.fn(async (_vubCol, height) => {
          calls.deleteLt.push({ network, height });
          return { data: null, error: null };
        }),
      })),
    })),
  }));
  return { from, calls };
}

function rpcResponse(result) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// Answers testnet RPCs with a 2-hash mempool; behavior for mainnet is
// injectable so each test controls whether mainnet succeeds or fails.
function stubRpcFetch({ onMainnet }) {
  const fetchMock = vi.fn(async (url, init = {}) => {
    const body = JSON.parse(String(init.body || "{}"));
    if (String(url).includes("/mainnet")) {
      return onMainnet(body);
    }
    if (body.method === "getrawmempool") {
      return rpcResponse({ verified: ["0xaaa", "0xbbb"], unverified: [] });
    }
    if (body.method === "getrawtransaction") {
      return rpcResponse({
        signers: [{ account: "NTestSender" }],
        size: 250,
        netfee: "100",
        sysfee: "200",
        validuntilblock: 999,
      });
    }
    if (body.method === "getblockcount") {
      return rpcResponse(500);
    }
    throw new Error(`unexpected RPC method: ${body.method}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function loadHandler(supabase) {
  const mod = await import("../../api/sync_mempool.js");
  const handler = mod.default || mod;
  handler._internal.setSupabaseClientForTests(supabase);
  return handler;
}

const authorizedReq = () => ({
  method: "POST",
  headers: { authorization: "Bearer test-cron-secret" },
});

describe("sync_mempool API", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
  });

  it("rejects unauthorized cron requests without touching RPC or storage", async () => {
    const table = createSyncSupabaseMock();
    const fetchMock = stubRpcFetch({ onMainnet: () => rpcResponse({ verified: [], unverified: [] }) });
    const handler = await loadHandler({ from: table.from });
    const res = createMockRes();

    await handler({ method: "POST", headers: {} }, res);

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.getBody())).toEqual({
      success: false,
      error: "Unauthorized cron request",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(table.from).not.toHaveBeenCalled();
  });

  it("preserves the success response shape and diffs stored hashes via set membership", async () => {
    // "0xaaa" is already stored (skipped from enrichment); "0xold" is no
    // longer in the node mempool and must be deleted.
    const table = createSyncSupabaseMock({
      storedHashesByNetwork: { testnet: ["0xaaa", "0xold"] },
    });
    stubRpcFetch({
      onMainnet: (body) => {
        if (body.method === "getrawmempool") return rpcResponse({ verified: [], unverified: [] });
        if (body.method === "getblockcount") return rpcResponse(500);
        throw new Error(`unexpected mainnet RPC method: ${body.method}`);
      },
    });
    const handler = await loadHandler({ from: table.from });
    const res = createMockRes();

    await handler(authorizedReq(), res);

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.getBody());
    // Success shape keys are pinned: no `errors` key when both networks succeed.
    expect(Object.keys(payload)).toEqual(["success", "mainnet", "testnet"]);
    expect(payload.success).toBe(true);
    expect(payload.mainnet).toEqual({ synced: 0, deleted: 0, total: 0 });
    expect(payload.testnet).toEqual({ synced: 1, deleted: 1, total: 2 });

    expect(table.calls.upserts).toHaveLength(1);
    expect(table.calls.upserts[0].options).toEqual({ onConflict: "hash" });
    expect(table.calls.upserts[0].records).toEqual([
      expect.objectContaining({
        hash: "0xbbb",
        network: "testnet",
        sender: "NTestSender",
        size: 250,
        netfee: 100,
        sysfee: 200,
        valid_until_block: 999,
        status: "pending",
      }),
    ]);
    expect(table.calls.deleteIn).toEqual([{ network: "testnet", hashes: ["0xold"] }]);
  });

  it("still syncs testnet and reports per-network errors when mainnet fails", async () => {
    const table = createSyncSupabaseMock({
      storedHashesByNetwork: { testnet: ["0xaaa", "0xold"] },
    });
    stubRpcFetch({
      onMainnet: () => {
        throw new Error("mainnet rpc down");
      },
    });
    const handler = await loadHandler({ from: table.from });
    const res = createMockRes();

    await handler(authorizedReq(), res);

    // One failed network must not fail the run: 500 is reserved for both
    // networks failing (same isolation contract as check_alerts).
    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.getBody());
    expect(payload.success).toBe(true);
    expect(payload.mainnet).toBeNull();
    expect(payload.testnet).toEqual({ synced: 1, deleted: 1, total: 2 });
    expect(payload.errors).toEqual({ mainnet: "mainnet rpc down" });

    // The testnet writes actually happened despite the mainnet throw.
    expect(table.calls.upserts).toHaveLength(1);
    expect(table.calls.deleteIn).toEqual([{ network: "testnet", hashes: ["0xold"] }]);
  });

  it("returns 500 only when both networks fail", async () => {
    const table = createSyncSupabaseMock();
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("all rpc down");
    }));
    const handler = await loadHandler({ from: table.from });
    const res = createMockRes();

    await handler(authorizedReq(), res);

    expect(res.statusCode).toBe(500);
    const payload = JSON.parse(res.getBody());
    expect(payload.success).toBe(false);
    expect(payload.mainnet).toBeNull();
    expect(payload.testnet).toBeNull();
    expect(payload.errors).toEqual({
      mainnet: "all rpc down",
      testnet: "all rpc down",
    });
  });
});
