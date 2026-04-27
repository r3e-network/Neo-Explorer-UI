const { get } = require('@vercel/edge-config');

module.exports.config = {
  runtime: 'edge',
};

const VALID_NETWORKS = new Set(['mainnet', 'testnet']);

module.exports = async function handler(req) {
  const url = new URL(req.url);
  const network = String(url.searchParams.get('network') || 'mainnet').trim().toLowerCase();
  if (!VALID_NETWORKS.has(network)) {
    return new Response(JSON.stringify({ success: false, error: 'Unsupported network' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const key = `liveness_${network}`;
    const data = await get(key);

    if (data) {
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 's-maxage=60, stale-while-revalidate=3600'
        }
      });
    } else {
      return new Response(JSON.stringify({ success: false, error: 'Liveness data not found in Edge Config' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
