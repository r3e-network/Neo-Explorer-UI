// Neo X (Blockscout stats microservice) read-only REST proxy.
//
// The client calls `/neox-stats/<net>/<resource...>` (see src/services/neox/
// statsService.js). A vercel.json rewrite maps named path parameters to this function
// so we can allowlist paths, rate-limit, time out, and degrade gracefully
// instead of letting the SPA talk to the third-party stats service directly.
// Mirrors the shape of api/neox.js.

const { withApiTelemetry } = require("./lib/telemetry");
const { sendJson, methodNotAllowed } = require("./lib/http");
const { enforceSimpleRateLimit } = require("./lib/simpleRateLimit");
const { NO_STORE_HEADERS, publicCacheHeaders } = require("./lib/cachePolicy");

module.exports.config = {
  runtime: "nodejs",
  maxDuration: 10,
};

const UPSTREAM_BASES = {
  mainnet: process.env.NEOX_MAINNET_STATS_BASE || "https://xexplorer.neo.org:8080/api/v1",
  testnet: process.env.NEOX_TESTNET_STATS_BASE || "https://xt4scan.ngd.network:8080/api/v1",
};

// Only the chart catalog, individual chart lines, and the counters list are
// proxied. Chart ids are camelCase identifiers (e.g. "averageGasPrice").
const CHART_ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9]{0,63}$/;

// The stats service exposes range/resolution filters only; everything else
// (including the catch-all `path` route param) is dropped before forwarding.
const FORWARDED_QUERY_KEYS = ["resolution", "from", "to"];

const FETCH_TIMEOUT_MS = 8000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = Number(process.env.NEOX_STATS_RATE_LIMIT_PER_MINUTE || 120);

const UNAVAILABLE_PAYLOAD = { error: "Neo X stats upstream unavailable" };

function isAllowedStatsPath(rest) {
  if (rest.length === 1) {
    return rest[0] === "lines" || rest[0] === "counters";
  }
  if (rest.length === 2) {
    return rest[0] === "lines" && CHART_ID_PATTERN.test(rest[1]);
  }
  return false;
}

function buildQueryString(query) {
  const params = new URLSearchParams();
  for (const key of FORWARDED_QUERY_KEYS) {
    const value = query?.[key];
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)));
    } else if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function hasValidQuery(query) {
  return Object.entries(query || {}).every(([key, value]) => {
    if (key === "net" || key === "path") return true;
    if (!FORWARDED_QUERY_KEYS.includes(key) || Array.isArray(value)) return false;
    return String(value ?? "").length <= 128;
  });
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
    return methodNotAllowed(res, { Allow: "GET", ...NO_STORE_HEADERS });
  }

  const net = String(firstQueryValue(req.query?.net) || "").trim();
  const rest = splitPath(req.query?.path);

  if (!UPSTREAM_BASES[net]) {
    return sendJson(res, 400, { error: "Unsupported Neo X network" }, NO_STORE_HEADERS);
  }
  if (!isAllowedStatsPath(rest)) {
    return sendJson(res, 400, { error: "Unsupported Neo X stats path" }, NO_STORE_HEADERS);
  }
  if (!hasValidQuery(req.query)) {
    return sendJson(res, 400, { error: "Unsupported Neo X stats query" }, NO_STORE_HEADERS);
  }

  if (
    !enforceSimpleRateLimit({
      req,
      res,
      prefix: "neox-stats",
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
      // A missing chart must stay a 404 (empty state), not an outage banner.
      const status = upstream.status === 404 ? 404 : 502;
      return sendJson(res, status, UNAVAILABLE_PAYLOAD, NO_STORE_HEADERS);
    }
    const payload = await upstream.json();
    // Chart data is daily-granularity, so a long shared cache is safe.
    return sendJson(res, 200, payload, publicCacheHeaders("chart"));
  } catch (_err) {
    return sendJson(res, 502, UNAVAILABLE_PAYLOAD, NO_STORE_HEADERS);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = withApiTelemetry("neox-stats", handler);
