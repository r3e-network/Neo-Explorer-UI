// Neo X (Blockscout stats microservice) read-only REST proxy.
//
// The client calls `/neox-stats/<net>/<resource...>` (see src/services/neox/
// statsService.js). A vercel.json rewrite maps that to this catch-all function
// so we can allowlist paths, rate-limit, time out, and degrade gracefully
// instead of letting the SPA talk to the third-party stats service directly.
// Mirrors the shape of api/neox/[...path].js.

const { withApiTelemetry } = require("../lib/telemetry");
const { sendJson, methodNotAllowed } = require("../lib/http");
const { enforceSimpleRateLimit } = require("../lib/simpleRateLimit");

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

async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, { Allow: "GET" });
  }

  const rawPath = req.query?.path;
  const segments = (Array.isArray(rawPath) ? rawPath : [rawPath])
    .map((segment) => String(segment || "").trim())
    .filter(Boolean);

  const net = segments[0];
  const rest = segments.slice(1);

  if (!UPSTREAM_BASES[net]) {
    return sendJson(res, 400, { error: "Unsupported Neo X network" });
  }
  if (!isAllowedStatsPath(rest)) {
    return sendJson(res, 400, { error: "Unsupported Neo X stats path" });
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
      return sendJson(res, status, UNAVAILABLE_PAYLOAD, { "Cache-Control": "no-store" });
    }
    const payload = await upstream.json();
    // Chart data is daily-granularity, so a long shared cache is safe.
    return sendJson(res, 200, payload, {
      "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
    });
  } catch (_err) {
    return sendJson(res, 502, UNAVAILABLE_PAYLOAD, { "Cache-Control": "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = withApiTelemetry("neox-stats", handler);
