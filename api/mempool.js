const { createClient } = require("@supabase/supabase-js");
const { enforceSimpleRateLimit } = require("./lib/simpleRateLimit");
const { callWithRpcEndpointFallback } = require("./lib/rpcEndpoints");
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

async function fetchMempoolFromNode(network, limit) {
  // Direct-node fallback: hit getrawmempool to get the hash list. We
  // intentionally don't fan out to getrawtransaction for each hash —
  // that would be N+1 RPCs and the explorer's mempool view degrades
  // gracefully when fee/sender fields are missing (renders 0 GAS).
  // The cron-populated Supabase cache provides the rich data; this
  // fallback's job is just keeping the count + hash list visible.
  try {
    const result = await callWithRpcEndpointFallback(network, async (url) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getrawmempool", params: [false] }),
      });
      if (!res.ok) throw new Error(`mempool RPC HTTP ${res.status}`);
      const json = await res.json();
      if (json?.error) throw new Error(json.error.message || "mempool RPC error");
      return json?.result;
    });

    const hashes = Array.isArray(result)
      ? result
      : Array.isArray(result?.verified) || Array.isArray(result?.unverified)
        ? [...(result.verified || []), ...(result.unverified || [])]
        : [];

    return hashes.slice(0, limit).map((hash) => ({
      hash,
      network,
      sender: "",
      size: 0,
      netfee: 0,
      sysfee: 0,
      valid_until_block: 0,
      timestamp: Date.now(),
      status: "pending",
    }));
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
