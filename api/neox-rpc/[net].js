// Neo X (EVM) read-only JSON-RPC proxy.
//
// The client POSTs `{ method, params }` to `/neox-rpc/<net>` (see
// src/services/neox/rpcService.js). A vercel.json rewrite maps that to this
// function so we can allowlist read-only methods, rate-limit, time out, and
// degrade gracefully instead of letting the SPA talk to the node directly.
// Mirrors the shape of api/neox.js; security-critical: only the
// methods below may ever be relayed — no state-changing, filter, or
// subscription calls.

const { withApiTelemetry } = require("../lib/telemetry");
const { sendJson, methodNotAllowed } = require("../lib/http");
const { enforceSimpleRateLimit } = require("../lib/simpleRateLimit");

module.exports.config = {
  runtime: "nodejs",
  maxDuration: 10,
};

const UPSTREAM_BASES = {
  mainnet: process.env.NEOX_MAINNET_RPC_BASE || "https://mainnet-2.rpc.banelabs.org",
  testnet: process.env.NEOX_TESTNET_RPC_BASE || "https://testnet-1.rpc.banelabs.org",
};

// Read-only method allowlist. Deliberately excludes anything that mutates
// state (eth_sendRawTransaction), manages node-side state (filters,
// subscriptions), or leaks node internals.
const ALLOWED_METHODS = new Set([
  "eth_call",
  "eth_blockNumber",
  "eth_gasPrice",
  "eth_getBalance",
  "eth_getCode",
  "eth_getTransactionCount",
  "txpool_status",
]);

const FETCH_TIMEOUT_MS = 8000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = Number(process.env.NEOX_RPC_RATE_LIMIT_PER_MINUTE || 120);
// Serialized-params cap: eth_call payloads are small; anything bigger is abuse.
const MAX_PARAMS_JSON_LENGTH = 50_000;
// Raw-body cap for the stream path, comfortably above the params cap.
const MAX_BODY_BYTES = 64 * 1024;

const UNAVAILABLE_PAYLOAD = { error: "Neo X RPC upstream unavailable" };

// Vercel parses JSON bodies into req.body; the dev middleware and tests may
// hand us a raw stream or a string instead. Returns the parsed body or null
// when it cannot be interpreted as JSON.
async function readJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body);
      } catch (_err) {
        return null;
      }
    }
    return req.body;
  }
  if (typeof req.on !== "function") return null;

  const raw = await new Promise((resolve) => {
    let data = "";
    let overflowed = false;
    req.on("data", (chunk) => {
      if (overflowed) return;
      data += chunk;
      if (data.length > MAX_BODY_BYTES) {
        overflowed = true;
        data = "";
      }
    });
    req.on("end", () => resolve(overflowed ? null : data));
    req.on("error", () => resolve(null));
  });

  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_err) {
    return null;
  }
}

async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, { Allow: "POST" });
  }

  const net = String(req.query?.net || "").trim();
  if (!UPSTREAM_BASES[net]) {
    return sendJson(res, 400, { error: "Unsupported Neo X network" });
  }

  const body = await readJsonBody(req);
  // A single { method, params } object only — batch arrays are rejected so a
  // client can never smuggle extra calls past the method allowlist.
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return sendJson(res, 400, { error: "Request body must be a single { method, params } object" });
  }

  const method = typeof body.method === "string" ? body.method : "";
  if (!ALLOWED_METHODS.has(method)) {
    return sendJson(res, 400, { error: "Unsupported RPC method" });
  }

  const params = body.params === undefined ? [] : body.params;
  if (!Array.isArray(params)) {
    return sendJson(res, 400, { error: "RPC params must be an array" });
  }
  let serializedParams;
  try {
    serializedParams = JSON.stringify(params);
  } catch (_err) {
    return sendJson(res, 400, { error: "RPC params must be JSON-serializable" });
  }
  if (typeof serializedParams !== "string" || serializedParams.length > MAX_PARAMS_JSON_LENGTH) {
    return sendJson(res, 400, { error: "RPC params too large" });
  }

  if (
    !enforceSimpleRateLimit({
      req,
      res,
      prefix: "neox-rpc",
      key: net,
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequests: RATE_LIMIT_MAX,
    })
  ) {
    return undefined; // 429 already written by the limiter
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const upstream = await fetch(UPSTREAM_BASES[net], {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      // Server-assigned id: the upstream envelope is not client-controlled.
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal,
    });
    if (!upstream.ok) {
      return sendJson(res, 502, UNAVAILABLE_PAYLOAD, { "Cache-Control": "no-store" });
    }
    // Verbatim passthrough, including any `error` member — RPC-level errors
    // (e.g. execution reverted) are data, not outages.
    const payload = await upstream.json();
    return sendJson(res, 200, payload, { "Cache-Control": "no-store" });
  } catch (_err) {
    return sendJson(res, 502, UNAVAILABLE_PAYLOAD, { "Cache-Control": "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = withApiTelemetry("neox-rpc", handler);
