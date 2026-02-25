import https from 'https';

const API_URL_MAINNET = 'https://mainnet1.neo.coz.io:443';
const API_URL_TESTNET = 'https://testnet1.neo.coz.io:443';

const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID || 'ecfg_dblofexkzmzp6mflwjqkdl4vsefo';

async function fetchRpc(url, method, params = [], id = 1) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
    req.end();
  });
}

async function fetchRpcBatch(url, requests) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(JSON.stringify(requests));
    req.end();
  });
}

async function calculateLiveness(network) {
  const url = network === 'testnet' ? API_URL_TESTNET : API_URL_MAINNET;
  
  console.log(`[${network}] Fetching block count...`);
  const countRes = await fetchRpc(url, 'getblockcount');
  const height = countRes.result;
  console.log(`[${network}] Block count: ${height}`);
  
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
      promises.push(fetchRpcBatch(url, requests));
    }
  }
  
  console.log(`[${network}] Fetching 5000 block headers in batches...`);
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
  
  return {
    success: true, 
    network, 
    blocksAnalyzed: blocks.length,
    liveness,
    updatedAt: Date.now()
  };
}

async function updateEdgeConfig(mainnetData, testnetData) {
  if (!VERCEL_API_TOKEN) {
    console.warn("No VERCEL_API_TOKEN found. Skipping Edge Config update. Here is the data:");
    console.log("Mainnet:", JSON.stringify(mainnetData, null, 2));
    return;
  }

  let url = `https://api.vercel.com/v1/edge-config/${EDGE_CONFIG_ID}/items`;
  if (process.env.VERCEL_TEAM_ID) {
    url += `?teamId=${process.env.VERCEL_TEAM_ID}`;
  }

  const payload = {
    items: [
      {
        operation: 'upsert',
        key: 'liveness_mainnet',
        value: mainnetData
      },
      {
        operation: 'upsert',
        key: 'liveness_testnet',
        value: testnetData
      }
    ]
  };

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log("Edge config updated successfully:", data);
          resolve();
        } else {
          console.error("Failed to update edge config. Status:", res.statusCode);
          console.error("Response:", data);
          reject(new Error(`Failed with status ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function main() {
  try {
    const [mainnetData, testnetData] = await Promise.all([
      calculateLiveness('mainnet'),
      calculateLiveness('testnet')
    ]);
    
    await updateEdgeConfig(mainnetData, testnetData);
  } catch (err) {
    console.error("Error running script:", err);
    process.exit(1);
  }
}

main();

