const { createClient } = require("@supabase/supabase-js");
const { enforceSimpleRateLimit } = require("./lib/simpleRateLimit");
const { withApiTelemetry } = require("./lib/telemetry");

const VALID_NETWORKS = new Set(["mainnet", "testnet"]);
let supabaseClient = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "").trim();
  const devAnonKey = String(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();
  const key = serviceKey || (process.env.NODE_ENV === "production" ? "" : devAnonKey);

  if (!url || !key) {
    throw new Error("Mempool storage is not configured.");
  }

  supabaseClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return supabaseClient;
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

  try {
    const { data, error } = await getSupabaseClient()
      .from("mempool_transactions")
      .select("*")
      .eq("network", network)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return res.status(200).json({ data: data || [] });
  } catch (error) {
    console.error("[mempool] fetch failed:", error);
    return res.status(500).json({ error: "Unable to load mempool transactions." });
  }
}

module.exports = withApiTelemetry("mempool", handler);
module.exports._internal = {
  normalizeLimit,
  normalizeNetwork,
  setSupabaseClientForTests(client) {
    supabaseClient = client;
  },
  resetSupabaseClientForTests() {
    supabaseClient = null;
  },
};
