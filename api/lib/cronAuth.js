const { timingSafeEqual } = require("crypto");

function getHeader(req, name) {
  if (typeof req?.headers?.get === "function") {
    return req.headers.get(name) || "";
  }
  return req?.headers?.[name.toLowerCase()] || req?.headers?.[name] || "";
}

function safeEqualStrings(a, b) {
  // timingSafeEqual requires equal-length buffers — bail out early
  // (length leak is unavoidable, but the value bytes stay constant-time).
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function isCronAuthorized(req) {
  const secret = String(process.env.CRON_SECRET || "").trim();
  if (!secret) {
    // Fail closed: when no CRON_SECRET is configured, reject the request in
    // ALL environments by default. The previously-open dev path is now behind
    // an explicit opt-in flag so a missing secret can never silently expose
    // the cron endpoints (e.g. if NODE_ENV is unset on a deployed instance).
    return String(process.env.ALLOW_UNAUTHENTICATED_CRON || "").trim().toLowerCase() === "true";
  }

  const authorization = String(getHeader(req, "authorization") || "").trim();
  const cronSecret = String(getHeader(req, "x-cron-secret") || "").trim();
  return safeEqualStrings(authorization, `Bearer ${secret}`) || safeEqualStrings(cronSecret, secret);
}

function unauthorizedCronResponse() {
  return new Response(JSON.stringify({ success: false, error: "Unauthorized cron request" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

module.exports = {
  isCronAuthorized,
  unauthorizedCronResponse,
};
