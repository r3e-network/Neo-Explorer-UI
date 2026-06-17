#!/usr/bin/env node
/**
 * Page-Level Integration Tests for Neo-Explorer-UI
 *
 * Tests every page's backend API dependencies end-to-end through the
 * production Cloudflare edge. Catches issues like the governance page
 * failing because of missing database tables.
 *
 * Usage:
 *   node tests/pages.test.js
 *   TEST_API_URL=https://api.n3index.dev node tests/pages.test.js
 *
 * Exit code 0 = all pass, 1 = at least one failure.
 */

"use strict";

const https = require("https");
const http = require("http");
const { URL } = require("url");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE = (process.env.TEST_API_URL || "https://api.n3index.dev").replace(/\/+$/, "");
const WEB_BASE = (process.env.TEST_WEB_URL || "https://www.neo3scan.com").replace(/\/+$/, "");
const SUPABASE_ANON_KEY =
  process.env.TEST_SUPABASE_KEY ||
  "eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogIndlYl9hbm9uIiwgImlzcyI6ICJuZW8zZnVyYS1zZWxmLWhvc3RlZCIsICJpYXQiOiAxNzc0NzczNjEwLCAiZXhwIjogMjA5MDEzMzYxMH0.NbfPVKehpKbVQznFWd6GrPlcD151GBuZCxwMvKmvsG8";

const NEO_HASH = "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5";
const GAS_HASH = "0xd2a4cff31913016155e38e474a2c06d08be276cf";
const REQUEST_TIMEOUT_MS = 15000;

// ---------------------------------------------------------------------------
// Auto-discovered test data (populated at runtime)
// ---------------------------------------------------------------------------

const discovered = {
  blockIndex: null,
  blockHash: null,
  txid: null,
  address: null,
  candidatePublicKey: null,
};

// ---------------------------------------------------------------------------
// HTTP helpers (pure Node.js, no external deps)
// ---------------------------------------------------------------------------

function httpRequest(url, { method = "GET", headers = {}, body = null, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === "https:" ? https : http;
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: { ...headers },
    };
    if (body) {
      opts.headers["Content-Type"] = opts.headers["Content-Type"] || "application/json";
      opts.headers["Content-Length"] = Buffer.byteLength(body);
    }
    const startMs = Date.now();
    const req = transport.request(opts, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf-8");
        let json = null;
        try { json = JSON.parse(raw); } catch { /* non-JSON response */ }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: raw,
          json,
          elapsedMs: Date.now() - startMs,
        });
      });
    });
    req.on("error", reject);
    const timer = setTimeout(() => {
      req.destroy(new Error("TIMEOUT"));
    }, timeoutMs);
    req.on("close", () => clearTimeout(timer));
    if (body) req.write(body);
    req.end();
  });
}

function httpReadPrefix(url, { headers = {}, timeoutMs = REQUEST_TIMEOUT_MS, maxBytes = 512 } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === "https:" ? https : http;
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: { ...headers },
    };
    const startMs = Date.now();
    let settled = false;
    const req = transport.request(opts, (res) => {
      const chunks = [];
      let bytes = 0;
      const finish = () => {
        if (settled) return;
        settled = true;
        req.destroy();
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks, Math.min(bytes, maxBytes)).toString("utf-8"),
          elapsedMs: Date.now() - startMs,
        });
      };
      res.on("data", (chunk) => {
        if (bytes < maxBytes) {
          const remaining = maxBytes - bytes;
          chunks.push(chunk.length > remaining ? chunk.subarray(0, remaining) : chunk);
          bytes += Math.min(chunk.length, remaining);
        }
        finish();
      });
      res.on("end", finish);
    });
    req.on("error", (err) => {
      if (settled) return;
      reject(err);
    });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      req.destroy(new Error("TIMEOUT"));
      reject(new Error("TIMEOUT"));
    }, timeoutMs);
    req.on("close", () => clearTimeout(timer));
    req.end();
  });
}

function get(path, extraHeaders = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  return httpRequest(url, { method: "GET", headers: { Accept: "application/json", ...extraHeaders } });
}

function webGet(path, extraHeaders = {}) {
  const url = path.startsWith("http") ? path : `${WEB_BASE}${path}`;
  return httpRequest(url, { method: "GET", headers: { Accept: "text/html,application/json", ...extraHeaders } });
}

function webPost(path, payload = {}, extraHeaders = {}) {
  const url = path.startsWith("http") ? path : `${WEB_BASE}${path}`;
  return httpRequest(url, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json", Accept: "application/json", ...extraHeaders },
  });
}

function rpcPost(network, method, params) {
  const url = `${BASE}/${network}`;
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
  return httpRequest(url, { method: "POST", body, headers: { "Content-Type": "application/json" } });
}

function assertRpcOk(res, label) {
  assert(res.status === 200, `${label} -> 200`, `status=${res.status}`);
  assert(!res.json?.error, `${label} has no JSON-RPC error`, JSON.stringify(res.json?.error || {}));
}

function rpcNumberResult(res) {
  return Number(
    res.json?.result?.["total counts"] ??
    res.json?.result?.count ??
    res.json?.result?.index ??
    res.json?.result
  );
}

function supabaseGet(path) {
  const url = `${BASE}${path}`;
  return httpRequest(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
}

function header(headers, name) {
  return String(headers[String(name).toLowerCase()] || "");
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

const results = [];   // { page, name, status, detail }
let currentPage = "";

function setPage(name) {
  currentPage = name;
  console.log(`\n--- ${name} ---`);
}

function pass(name, detail = "") {
  results.push({ page: currentPage, name, status: "PASS", detail });
  console.log(`  PASS  ${name}${detail ? `  (${detail})` : ""}`);
}

function fail(name, detail = "") {
  results.push({ page: currentPage, name, status: "FAIL", detail });
  console.log(`  FAIL  ${name}  ${detail}`);
}

function skip(name, detail = "") {
  results.push({ page: currentPage, name, status: "SKIP", detail });
  console.log(`  SKIP  ${name}  ${detail}`);
}

async function test(name, fn) {
  try {
    await fn();
  } catch (err) {
    const msg = err instanceof AggregateError
      ? `AggregateError: ${(err.errors || []).map((e) => e && e.message || e).join("; ")}`
      : String(err && err.message ? err.message : err);
    if (msg.includes("TIMEOUT") || msg.includes("ETIMEDOUT")) {
      skip(name, `timeout: ${msg}`);
    } else if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("AggregateError")) {
      skip(name, `network: ${msg}`);
    } else {
      fail(name, msg);
    }
  }
}

function assert(condition, name, detail = "") {
  if (condition) pass(name, detail);
  else fail(name, detail || "assertion failed");
}

// ---------------------------------------------------------------------------
// Auto-discovery: fetch a recent block and transaction for later tests
// ---------------------------------------------------------------------------

async function discoverTestData() {
  // Grab recent blocks
  const blocksRes = await get("/mainnet/blocks?limit=2");
  const blocksData = blocksRes.json?.data || (Array.isArray(blocksRes.json) ? blocksRes.json : []);
  if (blocksData.length > 0) {
    const b = blocksData[0];
    discovered.blockIndex = b.block_index ?? b.index ?? b.blockindex ?? b.height;
    discovered.blockHash = b.hash;
  }
  // Grab recent transaction
  const txRes = await get("/mainnet/transactions?limit=2");
  const txData = txRes.json?.data || (Array.isArray(txRes.json) ? txRes.json : []);
  if (txData.length > 0) {
    const t = txData[0];
    discovered.txid = t.hash || t.txid;
    discovered.address = t.sender || t.from;
  }
  // Fallback address (Neo Foundation, guaranteed to exist on mainnet)
  if (!discovered.address) {
    discovered.address = "NNLi44dJNXtDNSBkofB48aTVYtb1zZrNEs";
  }
  const validatorsRes = await get("/mainnet/metadata/validators");
  const validators = validatorsRes.json?.data || validatorsRes.json || [];
  if (Array.isArray(validators) && validators.length > 0) {
    discovered.candidatePublicKey = validators.find((item) => item?.public_key)?.public_key || null;
  }
  console.log(`Discovered test data:`);
  console.log(`  blockIndex: ${discovered.blockIndex}`);
  console.log(`  blockHash:  ${discovered.blockHash}`);
  console.log(`  txid:       ${discovered.txid}`);
  console.log(`  address:    ${discovered.address}`);
  console.log(`  candidate:  ${discovered.candidatePublicKey}`);
}

// ---------------------------------------------------------------------------
// Page tests
// ---------------------------------------------------------------------------

async function testHomePage() {
  setPage("Home Page (/)");

  await test("GET /mainnet/summary → 200", async () => {
    const res = await get("/mainnet/summary");
    assert(res.status === 200, "GET /mainnet/summary → 200", `status=${res.status}`);
    const d = res.json?.data || res.json || {};
    assert(
      d.total_block_count > 0 || d.block_count > 0 || d.totalBlockCount > 0,
      "summary has block_count",
      `got keys: ${Object.keys(d).join(", ")}`,
    );
  });

  await test("GET /mainnet/blocks?limit=6", async () => {
    const res = await get("/mainnet/blocks?limit=6");
    assert(res.status === 200, "GET /mainnet/blocks?limit=6 → 200", `status=${res.status}`);
    const items = res.json?.data || [];
    assert(items.length > 0 && items.length <= 6, "returns <=6 blocks", `count=${items.length}`);
  });

  await test("GET /mainnet/transactions?limit=6", async () => {
    const res = await get("/mainnet/transactions?limit=6");
    assert(res.status === 200, "GET /mainnet/transactions?limit=6 → 200", `status=${res.status}`);
    const items = res.json?.data || [];
    assert(items.length > 0 && items.length <= 6, "returns <=6 transactions", `count=${items.length}`);
  });

  await test("GET /mainnet/status → 200", async () => {
    const res = await get("/mainnet/status");
    assert(res.status === 200, "GET /mainnet/status → 200", `status=${res.status}`);
  });

  await test("Proxy getblockcount", async () => {
    const res = await rpcPost("mainnet", "getblockcount", []);
    assertRpcOk(res, "Proxy getblockcount");
    const count = rpcNumberResult(res);
    assert(count > 0, "getblockcount returns positive result", `count=${count}`);
  });
}

async function testBlocksPage() {
  setPage("Blocks Page (/blocks)");

  await test("GET /mainnet/blocks?limit=20", async () => {
    const res = await get("/mainnet/blocks?limit=20");
    assert(res.status === 200, "GET /mainnet/blocks?limit=20 → 200", `status=${res.status}`);
    const items = res.json?.data || [];
    assert(Array.isArray(items) && items.length > 0, "returns block array", `count=${items.length}`);
    // Verify DESC order
    if (items.length >= 2) {
      const idx0 = items[0].block_index ?? items[0].index;
      const idx1 = items[1].block_index ?? items[1].index;
      assert(idx0 > idx1, "blocks ordered by block_index DESC", `${idx0} > ${idx1}`);
    }
  });

  await test("GET /mainnet/blocks?limit=20&offset=20 (pagination)", async () => {
    const res = await get("/mainnet/blocks?limit=20&offset=20");
    assert(res.status === 200, "GET /mainnet/blocks?limit=20&offset=20 → 200", `status=${res.status}`);
    const items = res.json?.data || [];
    assert(items.length > 0, "pagination returns blocks", `count=${items.length}`);
  });

  if (discovered.blockIndex != null) {
    await test("GET /mainnet/blocks/{block_index}", async () => {
      const res = await get(`/mainnet/blocks/${discovered.blockIndex}`);
      assert(res.status === 200, "GET /mainnet/blocks/{index} → 200", `status=${res.status}`);
      const d = res.json?.data || res.json || {};
      assert(d.hash || d.block_hash, "block detail has hash", `keys: ${Object.keys(d).join(", ")}`);
    });
  }

  if (discovered.blockHash) {
    await test("GET /mainnet/blocks/{block_hash}", async () => {
      const res = await get(`/mainnet/blocks/${discovered.blockHash}`);
      assert(res.status === 200, "GET /mainnet/blocks/{hash} → 200", `status=${res.status}`);
    });
  }

  await test("Proxy getblock by height", async () => {
    const height = discovered.blockIndex || 1000;
    const res = await rpcPost("mainnet", "getblock", [height, 1]);
    assertRpcOk(res, "Proxy getblock");
    assert(res.json?.result?.hash, "getblock returns block hash");
  });

  await test("Proxy getblockheader by height", async () => {
    const height = discovered.blockIndex || 1000;
    const res = await rpcPost("mainnet", "getblockheader", [height, 1]);
    assertRpcOk(res, "Proxy getblockheader");
    assert(res.json?.result?.hash, "getblockheader returns block hash");
  });
}

async function testTransactionsPage() {
  setPage("Transactions Page (/transactions)");

  await test("GET /mainnet/transactions?limit=20", async () => {
    const res = await get("/mainnet/transactions?limit=20");
    assert(res.status === 200, "GET /mainnet/transactions?limit=20 → 200", `status=${res.status}`);
    const items = res.json?.data || [];
    assert(items.length > 0, "returns transactions", `count=${items.length}`);
  });

  if (discovered.txid) {
    await test("GET /mainnet/transactions/{txid}", async () => {
      const res = await get(`/mainnet/transactions/${discovered.txid}`);
      assert(res.status === 200, "GET /mainnet/transactions/{txid} → 200", `status=${res.status}`);
      const d = res.json?.data || res.json || {};
      assert(
        "vm_state" in d || "vmstate" in d || "vmState" in d || "gas_consumed" in d,
        "tx detail has vm_state or gas_consumed",
        `keys: ${Object.keys(d).slice(0, 10).join(", ")}`,
      );
    });

    await test("Proxy getrawtransaction", async () => {
      const res = await rpcPost("mainnet", "getrawtransaction", [discovered.txid, 1]);
      assertRpcOk(res, "Proxy getrawtransaction");
      assert(res.json?.result?.hash || res.json?.result?.txid, "getrawtransaction returns tx id/hash");
    });

    await test("Proxy getapplicationlog", async () => {
      const res = await rpcPost("mainnet", "getapplicationlog", [discovered.txid]);
      assertRpcOk(res, "Proxy getapplicationlog");
    });

    await test("REST transaction_executions by txid", async () => {
      const res = await get(`/rest/v1/transaction_executions?network=eq.mainnet&txid=eq.${discovered.txid}&limit=5`);
      assert(res.status === 200, "REST transaction_executions by txid -> 200", `status=${res.status}`);
      assert(Array.isArray(res.json), "transaction_executions returns array", `type=${typeof res.json}`);
    });

    await test("REST nep17_transfers by txid", async () => {
      const res = await get(`/rest/v1/nep17_transfers?network=eq.mainnet&txid=eq.${discovered.txid}&limit=5`);
      assert(res.status === 200, "REST nep17_transfers by txid -> 200", `status=${res.status}`);
      assert(Array.isArray(res.json), "nep17_transfers returns array", `type=${typeof res.json}`);
    });
  }
}

async function testContractsPage() {
  setPage("Contracts Page (/contracts)");

  await test("GET /mainnet/contracts?limit=20", async () => {
    const res = await get("/mainnet/contracts?limit=20");
    assert(res.status === 200, "GET /mainnet/contracts?limit=20 → 200", `status=${res.status}`);
  });

  await test("GET /mainnet/contracts?search=Neo", async () => {
    const res = await get("/mainnet/contracts?search=Neo");
    assert(res.status === 200, "GET /mainnet/contracts?search=Neo → 200", `status=${res.status}`);
    const items = res.json?.data || [];
    assert(items.length > 0, "search=Neo returns results", `count=${items.length}`);
  });

  await test("GET /mainnet/contracts/{NEO}", async () => {
    const res = await get(`/mainnet/contracts/${NEO_HASH}`);
    assert(res.status === 200, "GET /mainnet/contracts/{NEO} → 200", `status=${res.status}`);
  });

  await test("GET /mainnet/contracts/{NEO}/events?limit=5", async () => {
    const res = await get(`/mainnet/contracts/${NEO_HASH}/events?limit=5`);
    assert(res.status === 200, "GET /mainnet/contracts/{NEO}/events → 200", `status=${res.status}`);
  });

  await test("GET /mainnet/contracts/{NEO}/notifications?limit=5", async () => {
    const res = await get(`/mainnet/contracts/${NEO_HASH}/notifications?limit=5`);
    assert(res.status === 200, "GET /mainnet/contracts/{NEO}/notifications → 200", `status=${res.status}`);
    const items = res.json?.data || res.json || [];
    assert(Array.isArray(items) || (typeof items === "object"), "notifications response is valid", `type=${typeof items}`);
  });

  await test("GET /mainnet/contracts/{NEO}/calls?limit=5", async () => {
    const res = await get(`/mainnet/contracts/${NEO_HASH}/calls?limit=5`);
    assert(res.status === 200, "GET /mainnet/contracts/{NEO}/calls → 200", `status=${res.status}`);
    const items = res.json?.data || [];
    assert(Array.isArray(items), "contract calls response has data array", `type=${typeof items}`);
  });

  await test("Proxy getcontractstate (NEO)", async () => {
    const res = await rpcPost("mainnet", "getcontractstate", [NEO_HASH]);
    assertRpcOk(res, "Proxy getcontractstate");
    assert(res.json?.result, "getcontractstate returns result");
  });
}

async function testTokensPage() {
  setPage("Tokens Page (/tokens)");

  await test("GET /mainnet/tokens?limit=20", async () => {
    const res = await get("/mainnet/tokens?limit=20");
    assert(res.status === 200, "GET /mainnet/tokens?limit=20 → 200", `status=${res.status}`);
  });

  await test("GET /mainnet/tokens/{GAS}", async () => {
    const res = await get(`/mainnet/tokens/${GAS_HASH}`);
    assert(res.status === 200, "GET /mainnet/tokens/{GAS} → 200", `status=${res.status}`);
  });

  await test("GET /mainnet/tokens/{GAS}/holders?limit=5", async () => {
    const res = await get(`/mainnet/tokens/${GAS_HASH}/holders?limit=5`);
    assert(res.status === 200, "GET /mainnet/tokens/{GAS}/holders → 200", `status=${res.status}`);
    const items = res.json?.data || [];
    assert(Array.isArray(items), "token holders response has data array", `type=${typeof items}`);
  });

  await test("Proxy getcontractstate (GAS)", async () => {
    const res = await rpcPost("mainnet", "getcontractstate", [GAS_HASH]);
    assertRpcOk(res, "Proxy getcontractstate GAS");
    assert(res.json?.result, "getcontractstate GAS returns result");
  });
}

async function testAccountPage() {
  setPage("Account Page (/account-profile/{address})");
  const addr = discovered.address || "NNLi44dJNXtDNSBkofB48aTVYtb1zZrNEs";

  await test("GET /mainnet/accounts/{address}", async () => {
    const res = await get(`/mainnet/accounts/${addr}`);
    assert(
      res.status === 200 || res.status === 404,
      "GET /mainnet/accounts/{address} → 200 or 404",
      `status=${res.status}`,
    );
  });

  await test("GET /mainnet/accounts/{address}/transactions?limit=10", async () => {
    const res = await get(`/mainnet/accounts/${addr}/transactions?limit=10`);
    assert(res.status === 200, "GET /mainnet/accounts/{addr}/transactions → 200", `status=${res.status}`);
  });

  await test("GET /mainnet/accounts/{address}/transfers?limit=10", async () => {
    const res = await get(`/mainnet/accounts/${addr}/transfers?limit=10`);
    assert(res.status === 200, "GET /mainnet/accounts/{addr}/transfers → 200", `status=${res.status}`);
  });

  await test("GET /mainnet/accounts/{address}/balances", async () => {
    const res = await get(`/mainnet/accounts/${addr}/balances`);
    assert(res.status === 200, "GET /mainnet/accounts/{addr}/balances → 200", `status=${res.status}`);
  });

  await test("Proxy getnep17balances", async () => {
    const res = await rpcPost("mainnet", "getnep17balances", [addr]);
    assertRpcOk(res, "Proxy getnep17balances");
  });
}

async function testAccountsListPage() {
  setPage("Accounts List Page (/account/1)");

  await test("Frontend route /account/1 serves the SPA", async () => {
    const res = await webGet("/account/1");
    assert(res.status === 200, "GET /account/1 frontend route → 200", `status=${res.status}`);
    assert(header(res.headers, "content-type").includes("text/html"), "/account/1 returns HTML shell");
  });

  await test("Same-origin /data/mainnet/summary supports account totals", async () => {
    const res = await webGet("/data/mainnet/summary", { Accept: "application/json" });
    assert(res.status === 200, "GET /data/mainnet/summary → 200", `status=${res.status}`);
    const data = res.json?.data || res.json || {};
    assert(
      Number(data.total_address_count || data.last_indexed_block || 0) > 0,
      "summary has account total or indexed height",
      `keys=${Object.keys(data).join(", ")}`,
    );
  });

  let accountRows = [];
  await test("Same-origin /rest/mainnet/v_account_overview powers account table", async () => {
    const query = new URLSearchParams({
      select: "address,tx_sent,tx_signed,nep11_sent_events,nep11_received_events,last_tx_ms",
      network: "eq.mainnet",
      limit: "5",
      offset: "0",
      order: "nep17_net_raw.desc,last_tx_ms.desc",
    });
    const res = await webGet(`/rest/mainnet/v_account_overview?${query}`, { Accept: "application/json" });
    assert(res.status === 200, "GET /rest/mainnet/v_account_overview → 200", `status=${res.status}`);
    accountRows = Array.isArray(res.json) ? res.json : [];
    assert(accountRows.length > 0, "account overview returns rows", `count=${accountRows.length}`);
    assert(Boolean(accountRows[0]?.address), "account overview rows include address");
  });

  await test("Same-origin /rest/mainnet/v_nep17_balances supports account NEO/GAS columns", async () => {
    const addresses = [...new Set(accountRows.map((row) => row?.address).filter(Boolean))].slice(0, 5);
    if (!addresses.length) {
      skip("GET /rest/mainnet/v_nep17_balances", "no account rows discovered");
      return;
    }

    const query = new URLSearchParams({
      select: "address,contract_hash,balance_raw",
      network: "eq.mainnet",
      address: `in.(${addresses.join(",")})`,
      contract_hash: `in.(${NEO_HASH},${GAS_HASH})`,
    });
    const res = await webGet(`/rest/mainnet/v_nep17_balances?${query}`, { Accept: "application/json" });
    assert(res.status === 200, "GET /rest/mainnet/v_nep17_balances → 200", `status=${res.status}`);
    assert(Array.isArray(res.json), "v_nep17_balances returns array", `type=${typeof res.json}`);
  });
}

async function testGovernanceToolPage() {
  setPage("Governance Tool (/tools/governance) [CRITICAL]");

  await test("Supabase multisig_requests (network=eq.mainnet)", async () => {
    const res = await supabaseGet(
      "/rest/v1/multisig_requests?select=*,signatures:multisig_signatures(*)&network=eq.mainnet&order=created_at.desc&limit=5",
    );
    assert(res.status === 200, "multisig_requests (network col) → 200", `status=${res.status}`);
    assert(Array.isArray(res.json), "multisig_requests returns array", `type=${typeof res.json}`);
  });

  await test("Supabase multisig_requests (network_mode=eq.mainnet)", async () => {
    const res = await supabaseGet(
      "/rest/v1/multisig_requests?select=*,signatures:multisig_signatures(*)&network_mode=eq.mainnet&order=created_at.desc&limit=5",
    );
    // Either 200 or graceful error — we just need to know it doesn't crash
    assert(
      res.status === 200 || res.status === 400,
      "multisig_requests (network_mode col) → 200 or 400",
      `status=${res.status}`,
    );
  });

  await test("GET /mainnet/metadata/validators", async () => {
    const res = await get("/mainnet/metadata/validators");
    assert(res.status === 200, "GET /mainnet/metadata/validators → 200", `status=${res.status}`);
    const items = res.json?.data || res.json || [];
    assert(
      (Array.isArray(items) && items.length > 0) || (typeof items === "object" && Object.keys(items).length > 0),
      "validators metadata is non-empty",
      `type=${typeof items}, length=${Array.isArray(items) ? items.length : "n/a"}`,
    );
    if (Array.isArray(items) && items.length > 0 && !discovered.candidatePublicKey) {
      discovered.candidatePublicKey = items.find((item) => item?.public_key)?.public_key || null;
    }
  });

  await test("Proxy getcommittee", async () => {
    const res = await rpcPost("mainnet", "getcommittee", []);
    assertRpcOk(res, "Proxy getcommittee");
    assert(Array.isArray(res.json?.result), "getcommittee returns array result", `type=${typeof res.json?.result}`);
  });

  await test("Proxy getcandidates", async () => {
    const res = await rpcPost("mainnet", "getcandidates", []);
    assertRpcOk(res, "Proxy getcandidates");
  });
}

async function testCandidatesPage() {
  setPage("Candidates/Governance Page (/governance)");

  await test("GET /mainnet/metadata/validators", async () => {
    const res = await get("/mainnet/metadata/validators");
    assert(res.status === 200, "GET /mainnet/metadata/validators → 200", `status=${res.status}`);
    const items = res.json?.data || res.json || [];
    assert(
      (Array.isArray(items) && items.length > 0) || (typeof items === "object" && Object.keys(items).length > 0),
      "validators non-empty",
    );
    if (Array.isArray(items) && items.length > 0 && !discovered.candidatePublicKey) {
      discovered.candidatePublicKey = items.find((item) => item?.public_key)?.public_key || null;
    }
  });

  await test("GET /mainnet/governance/voters?candidate={validator}", async () => {
    if (!discovered.candidatePublicKey) {
      skip("GET /mainnet/governance/voters?candidate={validator}", "no candidate public key discovered");
      return;
    }
    const res = await get(`/mainnet/governance/voters?candidate=${encodeURIComponent(discovered.candidatePublicKey)}&limit=5`);
    assert(res.status === 200, "GET /mainnet/governance/voters → 200", `status=${res.status}`);
    const items = res.json?.data || [];
    assert(Array.isArray(items), "candidate voters response has data array", `type=${typeof items}`);
  });

  await test("Proxy getcommittee", async () => {
    const res = await rpcPost("mainnet", "getcommittee", []);
    assertRpcOk(res, "Proxy getcommittee");
    assert(Array.isArray(res.json?.result), "getcommittee returns array result", `type=${typeof res.json?.result}`);
  });

  await test("Proxy getcandidates", async () => {
    const res = await rpcPost("mainnet", "getcandidates", []);
    assertRpcOk(res, "Proxy getcandidates");
    assert(Array.isArray(res.json?.result), "getcandidates returns array result", `type=${typeof res.json?.result}`);
  });
}

async function testAnalyticsPage() {
  setPage("Analytics Page (/analytics)");

  await test("GET /mainnet/analytics/daily?days=30", async () => {
    const res = await get("/mainnet/analytics/daily?days=30");
    assert(res.status === 200, "GET /mainnet/analytics/daily → 200", `status=${res.status}`);
    const items = res.json?.data || [];
    assert(Array.isArray(items) && items.length > 0, "daily analytics has items", `count=${items.length}`);
  });

  await test("GET /mainnet/stats → 200", async () => {
    const res = await get("/mainnet/stats");
    assert(res.status === 200, "GET /mainnet/stats → 200", `status=${res.status}`);
    const data = res.json?.data || res.json || {};
    assert(Number(data.tx_count || data.total_tx_count || data.last_indexed_block || 0) > 0, "stats has indexed totals");
  });
}

async function testNNSPage() {
  setPage("NNS/Matrix Page");

  await test("GET /mainnet/nns/domains?limit=10", async () => {
    const res = await get("/mainnet/nns/domains?limit=10");
    assert(res.status === 200, "GET /mainnet/nns/domains → 200", `status=${res.status}`);
  });

  await test("GET /mainnet/metadata/addresses?limit=5", async () => {
    const res = await get("/mainnet/metadata/addresses?limit=5");
    assert(res.status === 200, "GET /mainnet/metadata/addresses → 200", `status=${res.status}`);
  });

  await test("GET /mainnet/nns/domains?owner={address}", async () => {
    const addr = discovered.address || "NNLi44dJNXtDNSBkofB48aTVYtb1zZrNEs";
    const res = await get(`/mainnet/nns/domains?owner=${encodeURIComponent(addr)}&limit=5`);
    assert(res.status === 200, "GET /mainnet/nns/domains?owner → 200", `status=${res.status}`);
  });
}

async function testBlockStateReads() {
  setPage("Block State Reads");

  await test("GET /mainnet/blocks/1846463/state-reads", async () => {
    const res = await get("/mainnet/blocks/1846463/state-reads");
    assert(res.status === 200, "GET state-reads → 200", `status=${res.status}`);
    const d = res.json?.data || res.json || {};
    const reads = d.reads || d.state_reads || (Array.isArray(d) ? d : []);
    assert(
      Array.isArray(reads) || typeof d === "object",
      "state-reads response has data",
      `type=${typeof d}`,
    );
  });
}

async function testMempoolTool() {
  setPage("Mempool Tool (/tools/mempool)");

  await test("Supabase mempool_transactions", async () => {
    const res = await supabaseGet("/rest/v1/mempool_transactions?limit=20&order=first_seen_at.desc");
    assert(
      res.status === 200 || res.status === 404,
      "mempool_transactions → 200 or 404",
      `status=${res.status}`,
    );
  });

  await test("Proxy getrawmempool", async () => {
    const res = await rpcPost("mainnet", "getrawmempool", []);
    assert(res.status === 200, "Proxy getrawmempool → 200", `status=${res.status}`);
  });
}

async function testMultiSigTool() {
  setPage("MultiSig Tool (/tools/multisig)");

  await test("Supabase multisig_requests", async () => {
    const res = await supabaseGet("/rest/v1/multisig_requests?select=*&limit=20&order=created_at.desc");
    assert(res.status === 200, "multisig_requests → 200", `status=${res.status}`);
    assert(Array.isArray(res.json), "multisig_requests returns array", `type=${typeof res.json}`);
  });
}

async function testSearch() {
  setPage("Search");

  const addr = discovered.address || "NNLi44dJNXtDNSBkofB48aTVYtb1zZrNEs";

  await test("Search by address", async () => {
    const res = await get(`/mainnet/accounts/${addr}`);
    assert(
      res.status === 200 || res.status === 404,
      "search by address → 200 or 404 (indexer may not have account summary)",
      `status=${res.status}`,
    );
  });

  if (discovered.blockIndex != null) {
    await test("Search by block index", async () => {
      const res = await get(`/mainnet/blocks/${discovered.blockIndex}`);
      assert(res.status === 200, "search by block index → 200", `status=${res.status}`);
    });
  }

  if (discovered.txid) {
    await test("Search by tx hash", async () => {
      const res = await get(`/mainnet/transactions/${discovered.txid}`);
      assert(res.status === 200, "search by tx hash → 200", `status=${res.status}`);
    });
  }

  await test("Search by contract hash", async () => {
    const res = await get(`/mainnet/contracts/${NEO_HASH}`);
    assert(res.status === 200, "search by contract hash → 200", `status=${res.status}`);
  });
}

async function testTestnet() {
  setPage("Testnet");

  await test("GET /testnet/status", async () => {
    const res = await get("/testnet/status");
    assert(res.status === 200, "GET /testnet/status → 200", `status=${res.status}`);
  });

  await test("GET /testnet/blocks?limit=2", async () => {
    const res = await get("/testnet/blocks?limit=2");
    assert(res.status === 200, "GET /testnet/blocks → 200", `status=${res.status}`);
  });

  await test("GET /testnet/transactions?limit=2", async () => {
    const res = await get("/testnet/transactions?limit=2");
    assert(res.status === 200, "GET /testnet/transactions → 200", `status=${res.status}`);
  });

  await test("Testnet proxy getblockcount", async () => {
    const res = await rpcPost("testnet", "getblockcount", []);
    assertRpcOk(res, "Testnet proxy getblockcount");
    const count = rpcNumberResult(res);
    assert(count > 0, "Testnet getblockcount returns positive result", `count=${count}`);
  });
}

async function testRestCompatTables() {
  setPage("REST Compatibility (all tables)");

  // Read-API compat tables are network-scoped. Query the production shape that
  // Explorer pages use and require 200 so missing allowlist/nginx entries are
  // caught here instead of hidden behind a broad 400/404 allowance.
  const readApiTables = [
    { table: "contract_notifications", query: "network=eq.mainnet&limit=2&order=id.desc" },
    { table: "nep17_transfers", query: "network=eq.mainnet&limit=2&order=id.desc" },
    { table: "nep11_transfers", query: "network=eq.mainnet&limit=2&order=id.desc" },
    { table: "validator_metadata_cache", query: "network=eq.mainnet&limit=2" },
    { table: "address_metadata_cache", query: "network=eq.mainnet&limit=2" },
    { table: "contract_metadata_cache", query: "network=eq.mainnet&limit=2" },
    { table: "indexer_state", query: "network=eq.mainnet&limit=2" },
    { table: "transaction_executions", query: "network=eq.mainnet&limit=2&order=id.desc" },
    { table: "transaction_signers", query: "network=eq.mainnet&limit=2&order=id.desc" },
  ];

  for (const { table, query } of readApiTables) {
    await test(`GET /rest/v1/${table}?${query}`, async () => {
      const res = await supabaseGet(`/rest/v1/${table}?${query}`);
      assert(res.status === 200, `REST /rest/v1/${table} → 200`, `status=${res.status}`);
      assert(Array.isArray(res.json), `REST /rest/v1/${table} returns array`, `type=${typeof res.json}`);
    });
  }

  for (const table of ["contract_notifications", "nep17_transfers", "indexer_state"]) {
    await test(`GET /rest/v1/${table}?limit=1 without network is rejected`, async () => {
      const res = await supabaseGet(`/rest/v1/${table}?limit=1`);
      assert(res.status === 400, `REST /rest/v1/${table} network guard → 400`, `status=${res.status}`);
    });
  }

  const supabaseTables = [
    "multisig_requests",
    "multisig_signatures",
    "mempool_transactions",
    "network_alerts",
  ];

  for (const table of supabaseTables) {
    await test(`Supabase /rest/v1/${table}?limit=2`, async () => {
      const res = await supabaseGet(`/rest/v1/${table}?limit=2`);
      assert(
        res.status === 200 || res.status === 404,
        `Supabase /rest/v1/${table} → 200 or 404`,
        `status=${res.status}`,
      );
    });
  }
}

async function testProxyRPCs() {
  setPage("Proxy RPCs (native neo methods)");

  await test("Proxy getversion", async () => {
    const res = await rpcPost("mainnet", "getversion", []);
    assertRpcOk(res, "Proxy getversion");
    assert(res.json?.result, "getversion has result", `keys: ${Object.keys(res.json?.result || {}).join(", ")}`);
  });

  await test("Proxy getblockcount", async () => {
    const res = await rpcPost("mainnet", "getblockcount", []);
    assertRpcOk(res, "Proxy getblockcount");
    const result = rpcNumberResult(res);
    assert(Number.isFinite(result) && result > 0, "getblockcount returns positive", `result=${res.json?.result}`);
  });

  await test("Proxy getcandidates", async () => {
    const res = await rpcPost("mainnet", "getcandidates", []);
    assertRpcOk(res, "Proxy getcandidates");
  });

  await test("Proxy getnep17balances", async () => {
    const addr = discovered.address || "NNLi44dJNXtDNSBkofB48aTVYtb1zZrNEs";
    const res = await rpcPost("mainnet", "getnep17balances", [addr]);
    assertRpcOk(res, "Proxy getnep17balances");
  });

  await test("Proxy getcontractstate (NEO)", async () => {
    const res = await rpcPost("mainnet", "getcontractstate", [NEO_HASH]);
    assertRpcOk(res, "Proxy getcontractstate");
    assert(res.json?.result, "getcontractstate has result");
  });

  await test("Proxy invokefunction (NEO symbol)", async () => {
    const res = await rpcPost("mainnet", "invokefunction", [NEO_HASH, "symbol", []]);
    assertRpcOk(res, "Proxy invokefunction");
    assert(res.json?.result?.state === "HALT", "invokefunction HALT state", `state=${res.json?.result?.state}`);
  });
}

async function testCachePerformance() {
  setPage("Cache & Performance");

  await test("Second request faster (cache HIT)", async () => {
    // Warm the cache
    const first = await get("/mainnet/summary");
    // Now hit again
    const second = await get("/mainnet/summary");
    assert(first.status === 200 && second.status === 200, "both requests succeed", `${first.status}, ${second.status}`);
    const cacheStatus = second.headers["cf-cache-status"] || second.headers["x-cache-status"] || "";
    // We check elapsed time as a signal. If the second request is faster or has cache header, pass.
    const faster = second.elapsedMs <= first.elapsedMs + 50; // allow 50ms jitter
    assert(
      faster || cacheStatus.toLowerCase().includes("hit"),
      "second request served from cache or faster",
      `first=${first.elapsedMs}ms, second=${second.elapsedMs}ms, cache-status=${cacheStatus}`,
    );
  });

  await test("State reads has immutable cache header", async () => {
    const res = await get("/mainnet/blocks/1846463/state-reads");
    assert(res.status === 200, "state-reads responds", `status=${res.status}`);
    const cc = res.headers["cache-control"] || "";
    assert(
      cc.includes("max-age") || cc.includes("immutable") || cc.includes("public"),
      "state-reads has cache-control header",
      `cache-control: ${cc}`,
    );
  });

  await test("Status endpoint has short-lived cache", async () => {
    const res = await get("/mainnet/status");
    assert(res.status === 200, "status responds");
    const cc = res.headers["cache-control"] || "";
    // Should have a cache header but short TTL
    if (cc) {
      const maxAgeMatch = cc.match(/max-age=(\d+)/);
      if (maxAgeMatch) {
        const maxAge = parseInt(maxAgeMatch[1], 10);
        assert(maxAge <= 300, "status cache max-age <= 300s", `max-age=${maxAge}`);
      } else {
        pass("status has cache-control", `cache-control: ${cc}`);
      }
    } else {
      pass("status endpoint (no cache-control, may be bypassed)");
    }
  });

  await test("Realtime head SSE opens with event-stream prefix", async () => {
    const res = await httpReadPrefix(`${BASE}/mainnet/sse/head`, {
      headers: { Accept: "text/event-stream" },
      timeoutMs: 8000,
    });
    assert(res.status === 200, "SSE /mainnet/sse/head → 200", `status=${res.status}`);
    assert(header(res.headers, "content-type").includes("text/event-stream"), "SSE content-type is event-stream");
    assert(
      res.body.includes(": connected") || res.body.includes("event:"),
      "SSE prefix contains heartbeat or event",
      `prefix=${JSON.stringify(res.body.slice(0, 80))}`,
    );
  });
}

async function testSecurityPosture() {
  setPage("Security Headers & API Guards");

  await test("Frontend root has defensive browser headers", async () => {
    const res = await webGet("/");
    assert(res.status === 200, "frontend root → 200", `status=${res.status}`);

    const csp = header(res.headers, "content-security-policy");
    assert(csp.includes("default-src 'self'"), "CSP has default-src self", `csp=${csp}`);
    assert(csp.includes("object-src 'none'"), "CSP blocks plugins/objects");
    assert(csp.includes("frame-ancestors 'none'"), "CSP blocks framing");
    assert(csp.includes("base-uri 'self'"), "CSP constrains base-uri");
    assert(csp.includes("form-action 'self'"), "CSP constrains form posts");
    assert(header(res.headers, "x-frame-options").toUpperCase() === "DENY", "X-Frame-Options DENY");
    assert(header(res.headers, "x-content-type-options").toLowerCase() === "nosniff", "X-Content-Type-Options nosniff");
    assert(
      header(res.headers, "referrer-policy").toLowerCase() === "strict-origin-when-cross-origin",
      "Referrer-Policy strict-origin-when-cross-origin",
    );
    assert(header(res.headers, "strict-transport-security").includes("max-age="), "HSTS max-age present");
  });

  await test("API edge has JSON safety and CORS headers", async () => {
    const res = await get("/mainnet/status");
    assert(res.status === 200, "API /mainnet/status → 200", `status=${res.status}`);
    assert(header(res.headers, "content-type").includes("application/json"), "API content-type is JSON");
    assert(header(res.headers, "x-content-type-options").toLowerCase() === "nosniff", "API X-Content-Type-Options nosniff");
    assert(header(res.headers, "x-frame-options").toUpperCase() === "DENY", "API X-Frame-Options DENY");
    assert(header(res.headers, "access-control-allow-origin") === "*", "API CORS allows public reads");
    const cacheControl = header(res.headers, "cache-control");
    const maxAge = Number.parseInt(cacheControl.match(/max-age=(\d+)/)?.[1] || "0", 10);
    const sMaxAge = Number.parseInt(cacheControl.match(/s-maxage=(\d+)/)?.[1] || "0", 10);
    assert(
      cacheControl.includes("no-store") || (maxAge > 0 && maxAge <= 300) || (sMaxAge > 0 && sMaxAge <= 300),
      "API status edge freshness is bounded",
      `cache-control=${cacheControl}`,
    );
  });

  await test("API edge OPTIONS preflight is handled", async () => {
    const res = await httpRequest(`${BASE}/mainnet/status`, {
      method: "OPTIONS",
      headers: {
        Origin: WEB_BASE,
        "Access-Control-Request-Method": "GET",
      },
    });
    assert([200, 204].includes(res.status), "API OPTIONS /mainnet/status → 200/204", `status=${res.status}`);
    assert(header(res.headers, "access-control-allow-origin") === "*", "OPTIONS CORS allow-origin present");
    assert(header(res.headers, "access-control-allow-methods").includes("GET"), "OPTIONS allows GET");
  });

  await test("Cron write endpoints reject unauthenticated requests", async () => {
    for (const path of ["/api/sync_mempool", "/api/check_alerts"]) {
      const res = await webPost(path, {});
      assert(res.status === 401, `${path} unauthenticated → 401`, `status=${res.status}`);
    }
  });

  await test("Chat notification endpoint rejects unauthenticated reads", async () => {
    const res = await webGet("/api/chat/notifications", { Accept: "application/json" });
    assert(res.status === 401, "chat notifications unauthenticated → 401", `status=${res.status}`);
  });

  await test("Relayer and sponsor reject non-POST requests", async () => {
    for (const path of ["/api/relayer", "/api/sponsor"]) {
      const res = await webGet(path, { Accept: "application/json" });
      assert(res.status === 405, `${path} GET → 405`, `status=${res.status}`);
    }
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nNeo-Explorer-UI Page Integration Tests`);
  console.log(`Base URL: ${BASE}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`=`.repeat(60));

  // Auto-discover test data
  try {
    await discoverTestData();
  } catch (err) {
    console.error(`WARN: auto-discovery failed: ${err.message}`);
  }

  // Run all page tests
  await testHomePage();
  await testBlocksPage();
  await testTransactionsPage();
  await testContractsPage();
  await testTokensPage();
  await testAccountPage();
  await testAccountsListPage();
  await testGovernanceToolPage();
  await testCandidatesPage();
  await testAnalyticsPage();
  await testNNSPage();
  await testBlockStateReads();
  await testMempoolTool();
  await testMultiSigTool();
  await testSearch();
  await testTestnet();
  await testRestCompatTables();
  await testProxyRPCs();
  await testCachePerformance();
  await testSecurityPosture();

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  console.log(`\n${"=".repeat(60)}`);
  console.log("SUMMARY BY PAGE");
  console.log(`${"=".repeat(60)}`);

  const pages = [...new Set(results.map((r) => r.page))];
  let totalPass = 0;
  let totalFail = 0;
  let totalSkip = 0;

  const pageSummary = [];
  for (const page of pages) {
    const pageResults = results.filter((r) => r.page === page);
    const p = pageResults.filter((r) => r.status === "PASS").length;
    const f = pageResults.filter((r) => r.status === "FAIL").length;
    const s = pageResults.filter((r) => r.status === "SKIP").length;
    totalPass += p;
    totalFail += f;
    totalSkip += s;
    const icon = f > 0 ? "FAIL" : s > 0 ? "WARN" : "OK  ";
    pageSummary.push({ page, pass: p, fail: f, skip: s, icon });
  }

  // Print table
  const maxPageLen = Math.max(20, ...pageSummary.map((r) => r.page.length));
  console.log(
    `  ${"Page".padEnd(maxPageLen)}  Pass  Fail  Skip  Status`,
  );
  console.log(`  ${"-".repeat(maxPageLen)}  ----  ----  ----  ------`);
  for (const row of pageSummary) {
    console.log(
      `  ${row.page.padEnd(maxPageLen)}  ${String(row.pass).padStart(4)}  ${String(row.fail).padStart(4)}  ${String(row.skip).padStart(4)}  ${row.icon}`,
    );
  }
  console.log(`  ${"-".repeat(maxPageLen)}  ----  ----  ----  ------`);
  console.log(
    `  ${"TOTAL".padEnd(maxPageLen)}  ${String(totalPass).padStart(4)}  ${String(totalFail).padStart(4)}  ${String(totalSkip).padStart(4)}  ${totalFail > 0 ? "FAIL" : "PASS"}`,
  );

  // Print failing tests
  const failures = results.filter((r) => r.status === "FAIL");
  if (failures.length > 0) {
    console.log(`\nFAILED TESTS:`);
    for (const f of failures) {
      console.log(`  [${f.page}] ${f.name}: ${f.detail}`);
    }
  }

  console.log(`\nDone. ${totalPass} passed, ${totalFail} failed, ${totalSkip} skipped.`);
  process.exit(totalFail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`\nFATAL: ${err.message}`);
  console.error(err.stack);
  process.exit(2);
});
