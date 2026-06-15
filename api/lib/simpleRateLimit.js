const net = require("node:net");

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 30;

const buckets = new Map();
const BUCKET_CLEANUP_EVERY = 256;
let bucketWriteCounter = 0;

function pruneExpiredBuckets(nowMs) {
  for (const [key, entry] of buckets) {
    if (!entry || nowMs >= entry.resetAtMs) {
      buckets.delete(key);
    }
  }
}

function isValidIpCandidate(value) {
  const ip = String(value || "").trim();
  if (!ip || ip.length > 64) return false;
  return net.isIP(ip) !== 0;
}

function getHeader(req, name) {
  const lower = name.toLowerCase();
  if (typeof req?.headers?.get === "function") {
    return req.headers.get(name) || req.headers.get(lower) || "";
  }
  return req?.headers?.[lower] || req?.headers?.[name] || "";
}

function isRunningOnVercel() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

// Default to trusting proxy headers when deployed on Vercel: there, the
// platform terminates the connection so req.socket.remoteAddress is always
// the platform proxy and every client would otherwise collapse into one
// rate-limit bucket. Locally (no VERCEL env) we keep trustProxy false so a
// spoofed X-Forwarded-For can't bypass the limiter. An explicit
// API_RATE_LIMIT_TRUST_PROXY of "0"/"1" always overrides the default.
function resolveDefaultTrustProxy() {
  const flag = String(process.env.API_RATE_LIMIT_TRUST_PROXY || "").trim();
  if (flag === "1") return true;
  if (flag === "0") return false;
  return isRunningOnVercel();
}

function getClientIp(req, { trustProxy = false } = {}) {
  if (trustProxy) {
    const candidates = [
      String(getHeader(req, "x-vercel-forwarded-for")).split(",")[0].trim(),
      String(getHeader(req, "x-forwarded-for")).split(",")[0].trim(),
      String(getHeader(req, "cf-connecting-ip")).trim(),
      String(getHeader(req, "x-real-ip")).trim(),
    ];
    for (const candidate of candidates) {
      if (isValidIpCandidate(candidate)) return candidate.toLowerCase();
    }
  }

  const remote = String(req?.socket?.remoteAddress || "").trim();
  if (isValidIpCandidate(remote)) return remote.toLowerCase();
  return "unknown-ip";
}

function consumeRateLimit(key, { windowMs = DEFAULT_WINDOW_MS, maxRequests = DEFAULT_MAX_REQUESTS, nowMs = Date.now() } = {}) {
  const safeKey = String(key || "unknown").trim() || "unknown";
  const safeWindow = Number.isFinite(windowMs) && windowMs > 0 ? windowMs : DEFAULT_WINDOW_MS;
  const safeMax = Number.isFinite(maxRequests) && maxRequests > 0 ? maxRequests : DEFAULT_MAX_REQUESTS;

  bucketWriteCounter += 1;
  if (bucketWriteCounter % BUCKET_CLEANUP_EVERY === 0) {
    pruneExpiredBuckets(nowMs);
  }

  const current = buckets.get(safeKey);

  if (!current || nowMs >= current.resetAtMs) {
    const resetAtMs = nowMs + safeWindow;
    buckets.set(safeKey, { count: 1, resetAtMs });
    return {
      allowed: true,
      limit: safeMax,
      remaining: Math.max(0, safeMax - 1),
      resetAtMs,
      retryAfterSeconds: Math.max(1, Math.ceil(safeWindow / 1000)),
    };
  }

  current.count += 1;
  buckets.set(safeKey, current);
  const allowed = current.count <= safeMax;
  return {
    allowed,
    limit: safeMax,
    remaining: Math.max(0, safeMax - current.count),
    resetAtMs: current.resetAtMs,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAtMs - nowMs) / 1000)),
  };
}

function setRateLimitHeaders(res, result) {
  if (!res || !result) return;
  res.setHeader("X-RateLimit-Limit", String(result.limit));
  res.setHeader("X-RateLimit-Remaining", String(result.remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.max(1, Math.ceil(result.resetAtMs / 1000))));
  if (!result.allowed) {
    res.setHeader("Retry-After", String(result.retryAfterSeconds));
  }
}

function enforceSimpleRateLimit({
  req,
  res,
  prefix,
  key,
  windowMs = DEFAULT_WINDOW_MS,
  maxRequests = DEFAULT_MAX_REQUESTS,
  trustProxy = resolveDefaultTrustProxy(),
  nowMs = Date.now(),
}) {
  const ip = getClientIp(req, { trustProxy });
  const safePrefix = String(prefix || "api").trim();
  const safeKey = String(key || "default").trim().toLowerCase();
  const result = consumeRateLimit(`${safePrefix}:${ip}:${safeKey}`, { windowMs, maxRequests, nowMs });
  setRateLimitHeaders(res, result);
  if (result.allowed) return true;
  res.status(429).json({ error: `Rate limit exceeded. Retry in ${result.retryAfterSeconds}s.` });
  return false;
}

function resetSimpleRateLimitForTests() {
  buckets.clear();
}

module.exports = {
  consumeRateLimit,
  enforceSimpleRateLimit,
  getClientIp,
  resetSimpleRateLimitForTests,
};
