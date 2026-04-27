const { createClient } = require("@supabase/supabase-js");
const { normalizeAddress } = require("./lib/chatAuth");
const { enforceSimpleRateLimit } = require("./lib/simpleRateLimit");
const { withApiTelemetry } = require("./lib/telemetry");

const VALID_NETWORKS = new Set(["mainnet", "testnet"]);
const VALID_ALERT_TYPES = new Set(["consensus_stuck", "consensus_missed", "account_event"]);
const VALID_THRESHOLDS = new Set([30, 60, 120, 300]);
const PUBLIC_KEY_PATTERN = /^(02|03)[0-9a-fA-F]{64}$/;
const EMAIL_PATTERN = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

let supabaseClient = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "").trim();
  const devAnonKey = String(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();
  const key = serviceKey || (process.env.NODE_ENV === "production" ? "" : devAnonKey);

  if (!url || !key) {
    throw new Error("Network Alerts storage is not configured.");
  }

  supabaseClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return supabaseClient;
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new Error("A valid delivery email is required.");
  }
  return email;
}

function normalizeNetwork(value) {
  const network = String(value || "").trim().toLowerCase();
  if (!VALID_NETWORKS.has(network)) {
    throw new Error("network must be mainnet or testnet.");
  }
  return network;
}

function normalizeAlertType(value) {
  const alertType = String(value || "").trim();
  if (!VALID_ALERT_TYPES.has(alertType)) {
    throw new Error("Unsupported alert type.");
  }
  return alertType;
}

function normalizeTarget(alertType, value) {
  const target = String(value || "").trim();
  if (alertType === "consensus_stuck") return null;
  if (alertType === "consensus_missed") {
    if (!PUBLIC_KEY_PATTERN.test(target)) {
      throw new Error("A valid compressed consensus public key is required.");
    }
    return target;
  }
  return normalizeAddress(target);
}

function normalizeThreshold(alertType, value) {
  if (alertType !== "consensus_stuck") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || !VALID_THRESHOLDS.has(parsed)) {
    throw new Error("Invalid alert threshold.");
  }
  return parsed;
}

function normalizeAlertPayload(body) {
  const network = normalizeNetwork(body?.network);
  const alertType = normalizeAlertType(body?.alert_type || body?.alertType);
  return {
    network,
    alert_type: alertType,
    threshold: normalizeThreshold(alertType, body?.threshold),
    target: normalizeTarget(alertType, body?.target),
    contact: normalizeEmail(body?.contact),
    is_active: true,
    miss_count: 0,
    last_seen_state: "",
  };
}

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const bodySize = Buffer.byteLength(JSON.stringify(req.body || {}), "utf8");
  if (bodySize > 4096) {
    return res.status(413).json({ error: "Alert request body is too large." });
  }

  let alertData;
  try {
    alertData = normalizeAlertPayload(req.body || {});
  } catch (error) {
    return res.status(400).json({ error: error.message || "Invalid alert request." });
  }

  if (!enforceSimpleRateLimit({
    req,
    res,
    prefix: "network-alerts",
    key: `${alertData.network}:${alertData.contact}`,
    windowMs: 60 * 60 * 1000,
    maxRequests: Number(process.env.NETWORK_ALERTS_RATE_LIMIT_PER_HOUR || 5),
  })) {
    return;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("network_alerts")
      .insert([alertData])
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[network_alerts] insert failed:", error);
    return res.status(500).json({ error: "Unable to register alert." });
  }
}

module.exports = withApiTelemetry("network_alerts", handler);
module.exports._internal = {
  normalizeAlertPayload,
  setSupabaseClientForTests(client) {
    supabaseClient = client;
  },
  resetSupabaseClientForTests() {
    supabaseClient = null;
  },
};
