function getHeader(req, name) {
  if (typeof req?.headers?.get === "function") {
    return req.headers.get(name) || "";
  }
  return req?.headers?.[name.toLowerCase()] || req?.headers?.[name] || "";
}

function isCronAuthorized(req) {
  const secret = String(process.env.CRON_SECRET || "").trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = String(getHeader(req, "authorization") || "").trim();
  const cronSecret = String(getHeader(req, "x-cron-secret") || "").trim();
  return authorization === `Bearer ${secret}` || cronSecret === secret;
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
