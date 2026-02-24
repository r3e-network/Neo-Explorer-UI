export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const network = url.searchParams.get('network') || 'mainnet';
  
  const API_URL = network === 'testnet' ? 'https://testnet1.neo.coz.io:443' : 'https://mainnet1.neo.coz.io:443';
  
  try {
    const countRes = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getblockcount', params: [] })
    }).then(r => r.json());
    
    const height = countRes.result;
    
    // Fetch last 5000 blocks in 50 batches of 100
    const promises = [];
    for (let batch = 0; batch < 50; batch++) {
      const requests = [];
      for (let i = 0; i < 100; i++) {
        const bHeight = height - 1 - (batch * 100) - i;
        if (bHeight >= 0) {
          requests.push({ jsonrpc: '2.0', id: bHeight, method: 'getblockheader', params: [bHeight, true] });
        }
      }
      if (requests.length > 0) {
        promises.push(
          fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requests)
          }).then(r => r.json())
        );
      }
    }
    
    const results = await Promise.all(promises);
    
    let blocks = [];
    for (let res of results) {
      if (Array.isArray(res)) {
        blocks.push(...res.map(r => r.result));
      }
    }
    blocks.sort((a,b) => a.index - b.index);
    
    let viewChangesByNode = new Array(7).fill(0);
    let totalBlocksByNode = new Array(7).fill(0);
    
    let lastPrimary = -1;
    for (let b of blocks) {
      if (!b) continue;
      if (lastPrimary !== -1) {
        const expected = (lastPrimary + 1) % 7;
        if (b.primary !== expected) {
          let missed = expected;
          // limit loop to prevent infinite loop on edge cases
          let failsafe = 0;
          while (missed !== b.primary && failsafe < 7) {
            viewChangesByNode[missed]++;
            missed = (missed + 1) % 7;
            failsafe++;
          }
        }
      }
      if (b.primary >= 0 && b.primary < 7) {
        totalBlocksByNode[b.primary]++;
      }
      lastPrimary = b.primary;
    }
    
    const liveness = [];
    for (let i = 0; i < 7; i++) {
      const missed = viewChangesByNode[i];
      const proposed = totalBlocksByNode[i];
      const totalExpected = proposed + missed;
      const ratio = totalExpected > 0 ? (proposed / totalExpected) * 100 : 100;
      liveness.push({
        nodeIndex: i,
        proposed,
        missed,
        ratio: Number(ratio.toFixed(2))
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      network, 
      blocksAnalyzed: blocks.length,
      liveness 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' // cache for 1 hour
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
