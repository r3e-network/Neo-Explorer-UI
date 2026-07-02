// Shared JSON response helpers for the Vercel api/ handlers.
//
// Four handlers (liveness, prices, check_alerts, sync_mempool) each carried a
// diverged private copy of sendJson; this module is the single source of
// truth. It is the SUPERSET variant, taken verbatim from api/liveness.js:
//
//   - Node runtime path (res provided): sets res.statusCode, the JSON
//     Content-Type, any extra headers, and ends with the serialized payload.
//     For callers that pass no extraHeaders this is byte-identical to the
//     narrower copies it replaces.
//   - Edge/fetch path (no res object): returns a web Response instead.
//     tests/api/liveness.spec.js pins this path by invoking the handler with
//     only a Request, so the `if (!res)` branch is load-bearing.
//
// NOTE: the api/chat/* handlers use the res.status().json()-based json()
// helper from api/lib/chatAuth.js. That helper is intentionally NOT ported to
// this module — do not migrate chat handlers here.

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  if (!res) {
    return new Response(JSON.stringify(payload), {
      status: statusCode,
      headers: { "Content-Type": "application/json", ...extraHeaders },
    });
  }
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  for (const [key, value] of Object.entries(extraHeaders)) {
    res.setHeader(key, value);
  }
  res.end(JSON.stringify(payload));
  return undefined;
}

function methodNotAllowed(res, extraHeaders = {}) {
  return sendJson(res, 405, { error: "Method not allowed" }, extraHeaders);
}

module.exports = {
  sendJson,
  methodNotAllowed,
};
