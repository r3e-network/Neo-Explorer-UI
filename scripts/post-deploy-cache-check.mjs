#!/usr/bin/env node

const API_BASE = (process.env.TEST_API_URL || "https://api.n3index.dev").replace(/\/+$/, "");
const WEB_BASE = (process.env.TEST_WEB_URL || "https://www.neo3scan.com").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.POST_DEPLOY_TIMEOUT_MS || 15000);

function fail(message) {
  throw new Error(message);
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const started = Date.now();
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    return {
      response,
      text,
      elapsedMs: Date.now() - started,
      json: (() => {
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })(),
    };
  } finally {
    clearTimeout(timer);
  }
}

function header(response, name) {
  return response.headers.get(name) || "";
}

function maxAgeSeconds(value) {
  const match = String(value).match(/(?:^|,\s*)max-age=(\d+)/i);
  return match ? Number(match[1]) : null;
}

async function checkJson(url, label) {
  const result = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
  if (result.response.status !== 200) fail(`${label}: expected HTTP 200, got ${result.response.status}`);
  if (!result.json) fail(`${label}: expected JSON response`);
  return result;
}

async function checkEdgeCache(path, { label, expectedStrategy, maxAgeAtMost }) {
  const url = `${API_BASE}${path}`;
  const first = await checkJson(url, `${label} first request`);
  await new Promise((resolve) => setTimeout(resolve, 750));
  const second = await checkJson(url, `${label} second request`);

  const strategy = header(second.response, "x-explorer-cache-strategy");
  if (strategy !== expectedStrategy) {
    fail(`${label}: expected x-explorer-cache-strategy=${expectedStrategy}, got ${strategy || "<missing>"}`);
  }

  const cc = header(second.response, "cache-control");
  const ttl = maxAgeSeconds(cc);
  if (ttl === null || ttl > maxAgeAtMost) {
    fail(`${label}: expected cache-control max-age <= ${maxAgeAtMost}, got ${cc || "<missing>"}`);
  }

  const cacheStatus = header(second.response, "cf-cache-status") || header(second.response, "x-edge-cache");
  if (!/hit/i.test(cacheStatus)) {
    fail(`${label}: expected second request to hit edge cache, got ${cacheStatus || "<missing>"}`);
  }

  return {
    label,
    firstMs: first.elapsedMs,
    secondMs: second.elapsedMs,
    strategy,
    cacheStatus,
    cacheControl: cc,
  };
}

async function checkRpc() {
  const result = await fetchWithTimeout(`${API_BASE}/mainnet`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getblockcount", params: [] }),
  });
  if (result.response.status !== 200) fail(`JSON-RPC getblockcount: expected HTTP 200, got ${result.response.status}`);
  if (result.json?.error) fail(`JSON-RPC getblockcount returned error: ${JSON.stringify(result.json.error)}`);
  if (!Number.isFinite(Number(result.json?.result))) fail(`JSON-RPC getblockcount result is not numeric: ${result.text}`);
  return { blockCount: Number(result.json.result), elapsedMs: result.elapsedMs };
}

async function checkWeb() {
  const home = await fetchWithTimeout(`${WEB_BASE}/`, { headers: { accept: "text/html" } });
  if (home.response.status !== 200) fail(`Explorer home: expected HTTP 200, got ${home.response.status}`);
  const assetMatch = home.text.match(/assets\/[^"']+\.js/);
  if (!assetMatch) fail("Explorer home: could not find built JS asset");

  const asset = await fetchWithTimeout(`${WEB_BASE}/${assetMatch[0]}`);
  const cc = header(asset.response, "cache-control");
  if (!/immutable/i.test(cc) || maxAgeSeconds(cc) < 31536000) {
    fail(`Explorer asset: expected immutable one-year cache, got ${cc || "<missing>"}`);
  }
  return {
    homeServer: header(home.response, "server"),
    asset: assetMatch[0],
    assetCacheControl: cc,
  };
}

async function main() {
  const checks = [];
  checks.push(await checkWeb());
  checks.push(await checkRpc());
  checks.push(await checkEdgeCache("/indexer/v1/networks/mainnet/status", {
    label: "mainnet status",
    expectedStrategy: "Dynamic-5s",
    maxAgeAtMost: 5,
  }));
  checks.push(await checkEdgeCache("/indexer/v1/networks/mainnet/blocks?limit=3", {
    label: "latest blocks",
    expectedStrategy: "Dynamic-5s",
    maxAgeAtMost: 5,
  }));
  checks.push(await checkEdgeCache("/indexer/v1/networks/mainnet/summary", {
    label: "mainnet summary",
    expectedStrategy: "Dynamic-15s",
    maxAgeAtMost: 15,
  }));

  console.log(JSON.stringify({ ok: true, apiBase: API_BASE, webBase: WEB_BASE, checks }, null, 2));
}

main().catch((err) => {
  console.error(`post-deploy cache check failed: ${err.message}`);
  process.exit(1);
});
