import { get } from '@vercel/edge-config';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const network = url.searchParams.get('network') || 'mainnet';
  
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

