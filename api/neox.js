// Neo X (Blockscout v2) read-only REST proxy.
//
// The client calls `/neox/<net>/<resource...>` (see src/services/neox/
// blockscoutClient.js). A vercel.json rewrite maps the named path parameters
// to this stable function so we can allowlist paths, rate-limit, time out, and degrade
// gracefully instead of letting the SPA talk to the third-party explorer
// directly. Mirrors the shape of api/network-monitor.js + api/prices.js.

const { withApiTelemetry } = require("./lib/telemetry");
const { sendJson, methodNotAllowed } = require("./lib/http");
const { enforceSimpleRateLimit } = require("./lib/simpleRateLimit");

module.exports.config = {
  runtime: "nodejs",
  maxDuration: 10,
};

const UPSTREAM_BASES = {
  mainnet: process.env.NEOX_MAINNET_BLOCKSCOUT_BASE || "https://xexplorer.neo.org/api/v2",
  testnet: process.env.NEOX_TESTNET_BLOCKSCOUT_BASE || "https://xt4scan.ngd.network/api/v2",
};

// Only read-only Blockscout v2 collections are proxied. The first path segment
// after the net must be one of these.
const ALLOWED_TOP_SEGMENTS = new Set([
  "blocks",
  "transactions",
  "addresses",
  "tokens",
  "smart-contracts",
  "search",
  "stats",
  "main-page",
]);

const FETCH_TIMEOUT_MS = 8000;
const MAX_PATH_SEGMENTS = 8;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = Number(process.env.NEOX_RATE_LIMIT_PER_MINUTE || 120);

const UNAVAILABLE_PAYLOAD = { error: "Neo X explorer upstream unavailable" };

function buildQueryString(query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query || {})) {
    if (key === "net" || key === "path") continue; // rewrite params, not upstream query
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)));
    } else if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function splitPath(value) {
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => String(item || "").split("/"))
    .map((segment) => segment.trim())
    .filter(Boolean);
}

async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, { Allow: "GET" });
  }

  const net = String(firstQueryValue(req.query?.net) || "").trim();
  const rest = splitPath(req.query?.path);

  if (!UPSTREAM_BASES[net]) {
    return sendJson(res, 400, { error: "Unsupported Neo X network" });
  }
  if (rest.length === 0 || rest.length > MAX_PATH_SEGMENTS) {
    return sendJson(res, 400, { error: "Unsupported Neo X path" });
  }
  if (!ALLOWED_TOP_SEGMENTS.has(rest[0])) {
    return sendJson(res, 400, { error: "Unsupported Neo X resource" });
  }
  if (rest.some((segment) => segment.includes("..") || segment.includes("/") || segment.includes("\\"))) {
    return sendJson(res, 400, { error: "Invalid Neo X path" });
  }

  if (
    !enforceSimpleRateLimit({
      req,
      res,
      prefix: "neox",
      key: net,
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequests: RATE_LIMIT_MAX,
    })
  ) {
    return undefined; // 429 already written by the limiter
  }

  const upstreamPath = rest.map((segment) => encodeURIComponent(segment)).join("/");
  const upstreamUrl = `${UPSTREAM_BASES[net]}/${upstreamPath}${buildQueryString(req.query)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!upstream.ok) {
      // A missing resource must stay a 404 (empty state), not an outage banner.
      const status = upstream.status === 404 ? 404 : 502;
      return sendJson(res, status, UNAVAILABLE_PAYLOAD, { "Cache-Control": "no-store" });
    }
    const payload = await upstream.json();
    return sendJson(res, 200, payload, {
      "Cache-Control": "public, max-age=5, s-maxage=10, stale-while-revalidate=30",
    });
  } catch (_err) {
    return sendJson(res, 502, UNAVAILABLE_PAYLOAD, { "Cache-Control": "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = withApiTelemetry("neox", handler);
