const { createClient } = require("@supabase/supabase-js");
const { enforceSimpleRateLimit } = require("./lib/simpleRateLimit");
const { callWithRpcEndpointFallback } = require("./lib/rpcEndpoints");
const { runWithConcurrency } = require("./lib/concurrency");
const { withApiTelemetry } = require("./lib/telemetry");

const VALID_NETWORKS = new Set(["mainnet", "testnet"]);
let supabaseClient = null;
// Memoize the "config-missing" decision so we don't retry getSupabaseClient()
// on every request — the env vars don't materialize at runtime.
let supabaseConfigChecked = false;
let supabaseConfigured = false;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  if (supabaseConfigChecked && !supabaseConfigured) return null;

  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "").trim();
  const devAnonKey = String(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();
  const key = serviceKey || (process.env.NODE_ENV === "production" ? "" : devAnonKey);

  supabaseConfigChecked = true;
  if (!url || !key) {
    supabaseConfigured = false;
    return null;
  }

  supabaseConfigured = true;
  supabaseClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return supabaseClient;
}

// How many pending txs we'll enrich with getrawtransaction in the fallback
// path. The full mempool can hold up to 50k entries on Neo nodes, but the
// explorer UI only needs detail for the visible page (~100). Capping
// concurrent enrichment keeps a single mempool request under ~1s of
// upstream load even on a busy network.
const MEMPOOL_FALLBACK_ENRICH_CAP = 100;
// Parallelism for getrawtransaction calls during enrichment. Higher =
// faster fetch, more concurrent open sockets to the node. 8 is a safe
// balance for a single Vercel function instance.
const MEMPOOL_FALLBACK_ENRICH_CONCURRENCY = 8;

async function postRpc(url, method, params, signal) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal,
  });
  if (!res.ok) throw new Error(`${method} HTTP ${res.status}`);
  const json = await res.json();
  if (json?.error) throw new Error(json.error.message || `${method} RPC error`);
  return json?.result;
}

function buildPendingRecord(network, hash, txData = null) {
  if (!txData || txData.__error) {
    return {
      hash,
      network,
      sender: "",
      size: 0,
      netfee: 0,
      sysfee: 0,
      valid_until_block: 0,
      timestamp: Date.now(),
      status: "pending",
    };
  }
  return {
    hash: txData.hash || hash,
    network,
    sender: txData.signers?.[0]?.account || "",
    size: Number(txData.size) || 0,
    netfee: Number(txData.netfee) || 0,
    sysfee: Number(txData.sysfee) || 0,
    valid_until_block: Number(txData.validuntilblock) || 0,
    timestamp: Date.now(),
    status: "pending",
  };
}

async function fetchMempoolFromNode(network, limit) {
  // Direct-node fallback when the Supabase cache is unavailable. We hit
  // getrawmempool for the hash list, then fan out to getrawtransaction
  // for the first MEMPOOL_FALLBACK_ENRICH_CAP hashes to enrich each
  // record with sender / size / fees / validUntilBlock. Hashes beyond
  // the cap fall back to bare records so the count stays accurate.
  try {
    const mempoolResult = await callWithRpcEndpointFallback(network, (url) =>
      postRpc(url, "getrawmempool", [false]),
    );

    const hashes = Array.isArray(mempoolResult)
      ? mempoolResult
      : Array.isArray(mempoolResult?.verified) || Array.isArray(mempoolResult?.unverified)
        ? [...(mempoolResult.verified || []), ...(mempoolResult.unverified || [])]
        : [];

    if (hashes.length === 0) return [];

    const truncated = hashes.slice(0, limit);
    const enrichSlice = truncated.slice(0, MEMPOOL_FALLBACK_ENRICH_CAP);
    const tailSlice = truncated.slice(MEMPOOL_FALLBACK_ENRICH_CAP);

    const enriched = await runWithConcurrency(
      enrichSlice,
      (hash) =>
        callWithRpcEndpointFallback(network, (url) =>
          postRpc(url, "getrawtransaction", [hash, true]),
        ),
      MEMPOOL_FALLBACK_ENRICH_CONCURRENCY,
    );

    const records = enrichSlice.map((hash, i) => buildPendingRecord(network, hash, enriched[i]));
    for (const hash of tailSlice) {
      records.push(buildPendingRecord(network, hash, null));
    }
    return records;
  } catch (error) {
    console.error("[mempool] node-RPC fallback failed:", error?.message || error);
    return [];
  }
}

function normalizeNetwork(value) {
  const network = String(value || "mainnet").trim().toLowerCase();
  if (!VALID_NETWORKS.has(network)) {
    throw new Error("network must be mainnet or testnet.");
  }
  return network;
}

function normalizeLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1000;
  return Math.min(Math.max(Math.trunc(parsed), 1), 1000);
}

async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  let network;
  let limit;
  try {
    network = normalizeNetwork(req.query?.network);
    limit = normalizeLimit(req.query?.limit);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Invalid mempool request." });
  }

  if (!enforceSimpleRateLimit({
    req,
    res,
    prefix: "mempool",
    key: network,
    windowMs: 60 * 1000,
    maxRequests: Number(process.env.MEMPOOL_RATE_LIMIT_PER_MINUTE || 120),
  })) {
    return;
  }

  // Brief edge cache to absorb refresh bursts without hammering Supabase
  // or the Neo node. Mempool churns ~per-block (~3s on Neo), so 2s is a
  // sensible upper bound that keeps the view feeling live while letting
  // the CDN coalesce concurrent visitors.
  res.setHeader("Cache-Control", "public, max-age=2, s-maxage=2, stale-while-revalidate=10");

  // Primary path: Supabase cache populated by the sync_mempool cron.
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("mempool_transactions")
        .select("*")
        .eq("network", network)
        .order("timestamp", { ascending: false })
        .limit(limit);

      if (error) throw error;
      if (data && data.length > 0) {
        return res.status(200).json({ data });
      }
      // Empty Supabase result is suspicious (cron may have stalled or the
      // table was just truncated). Fall through to direct-node fallback
      // so the UI doesn't show "no transactions" when the node clearly
      // has pending ones.
    } catch (error) {
      console.error("[mempool] supabase fetch failed, falling back:", error?.message || error);
    }
  }

  // Fallback / unconfigured path: hit the Neo node directly.
  const fallbackData = await fetchMempoolFromNode(network, limit);
  return res.status(200).json({ data: fallbackData });
}

module.exports = withApiTelemetry("mempool", handler);
module.exports._internal = {
  normalizeLimit,
  normalizeNetwork,
  setSupabaseClientForTests(client) {
    supabaseClient = client;
    supabaseConfigChecked = true;
    supabaseConfigured = client != null;
  },
  resetSupabaseClientForTests() {
    supabaseClient = null;
    supabaseConfigChecked = false;
    supabaseConfigured = false;
  },
};
