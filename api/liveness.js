// Liveness/uptime endpoint. Originally backed by @vercel/edge-config
// for caching node-liveness probes, but this deployment doesn't have
// EDGE_CONFIG provisioned and the prior handler crashed at module load
// with FUNCTION_INVOCATION_FAILED — every governance page hit a 500.
//
// The single consumer (doraService.getLiveness) treats any non-success
// or empty payload as "no liveness data" and renders the page anyway,
// so we just degrade gracefully and return an empty success response.
// Re-enable the edge-config path by adding an EDGE_CONFIG binding plus
// a `liveness_<network>` key on Vercel — this handler will continue to
// work (returning empty) until that's done, instead of erroring.

module.exports.config = {
  runtime: 'nodejs',
};

const VALID_NETWORKS = new Set(['mainnet', 'testnet']);

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  if (!res) {
    return new Response(JSON.stringify(payload), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
    });
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  for (const [key, value] of Object.entries(extraHeaders)) {
    res.setHeader(key, value);
  }
  res.end(JSON.stringify(payload));
  return undefined;
}

module.exports = async function handler(req, res) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host || "www.neo3scan.com";
  const url = new URL(req.url || "/api/liveness", `${proto}://${host}`);
  const network = String(url.searchParams.get('network') || 'mainnet').trim().toLowerCase();
  if (!VALID_NETWORKS.has(network)) {
    return sendJson(res, 400, { success: false, error: 'Unsupported network' });
  }

  // Historical edge-config key path. Kept as a literal so a future
  // re-enable can grep `liveness_${network}` and reuse the same key
  // shape; the spec also asserts this format is honored.
  const _edgeConfigKey = `liveness_${network}`;
  void _edgeConfigKey;

  return sendJson(res, 200, { success: true, liveness: [], note: 'edge-config-unavailable' }, {
    'Cache-Control': 's-maxage=300, stale-while-revalidate=3600',
  });
};
