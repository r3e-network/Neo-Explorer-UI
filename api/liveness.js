module.exports.config = {
  runtime: 'edge',
};

const VALID_NETWORKS = new Set(['mainnet', 'testnet']);

// Lazy edge-config import: when EDGE_CONFIG is not configured on the
// deployment, importing @vercel/edge-config at module-load time
// crashes the function with FUNCTION_INVOCATION_FAILED before our
// try/catch ever runs. Importing inside the handler turns that into a
// graceful 200 with an empty liveness map so the consumer
// (doraService.getLiveness) just degrades to "no liveness data".
let edgeConfigGetter = null;
let edgeConfigUnavailable = false;

async function getEdgeConfigGetter() {
  if (edgeConfigGetter) return edgeConfigGetter;
  if (edgeConfigUnavailable) return null;
  if (!process.env.EDGE_CONFIG) {
    edgeConfigUnavailable = true;
    return null;
  }
  try {
    const mod = await import('@vercel/edge-config');
    edgeConfigGetter = mod.get;
    return edgeConfigGetter;
  } catch (_err) {
    edgeConfigUnavailable = true;
    return null;
  }
}

module.exports = async function handler(req) {
  const url = new URL(req.url);
  const network = String(url.searchParams.get('network') || 'mainnet').trim().toLowerCase();
  if (!VALID_NETWORKS.has(network)) {
    return new Response(JSON.stringify({ success: false, error: 'Unsupported network' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const get = await getEdgeConfigGetter();
  if (!get) {
    return new Response(
      JSON.stringify({ success: true, liveness: [], note: 'edge-config-unavailable' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 's-maxage=300, stale-while-revalidate=3600',
        },
      },
    );
  }

  try {
    const key = `liveness_${network}`;
    const data = await get(key);

    if (data) {
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 's-maxage=60, stale-while-revalidate=3600',
        },
      });
    }
    return new Response(JSON.stringify({ success: true, liveness: [] }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[liveness] edge-config read failed:', err?.message || err);
    }
    return new Response(
      JSON.stringify({ success: true, liveness: [], error: err?.message || 'edge-config-error' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
