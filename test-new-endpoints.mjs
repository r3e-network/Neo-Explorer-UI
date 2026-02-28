import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fetch = require('node-fetch');

const HOST = 'http://198.244.215.132:1927'; // Checking Mainnet (staging)

async function testRpc(method, params) {
  try {
    const req = await fetch(HOST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
    });
    const res = await req.json();
    if (res.error) {
       console.log(`[FAIL] ${method}:`, res.error);
    } else {
       const result = res.result;
       const count = Array.isArray(result) ? result.length : (result ? 'OK' : 'Empty');
       console.log(`[PASS] ${method}: Result count/status = ${count}`);
       if (Array.isArray(result) && result.length > 0) {
         console.log(`       Sample:`, JSON.stringify(result[0]).substring(0, 100) + '...');
       }
    }
  } catch (e) {
    console.log(`[ERROR] ${method}: ${e.message}`);
  }
}

async function run() {
  console.log("--- Testing New Endpoints on Staging (Mainnet) ---");
  await testRpc('GetDailyContracts', { Days: 7 });
  await testRpc('GetTokenTransferVolume', { Days: 7 });
  await testRpc('GetNewAddresses', { Days: 7 });
  await testRpc('GetNNSResolve', { Domain: 'neo.neo' });
}

run();
