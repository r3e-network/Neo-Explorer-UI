import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fetch = require('node-fetch');

// Test endpoints via server public IP (or we can SSH tunnel if not exposed)
// Based on connect_sgx.sh the host is 198.244.215.132
const HOST = 'http://198.244.215.132';

async function checkEndpoint(port, name) {
  console.log(`Checking ${name} on port ${port}...`);
  try {
    const res = await fetch(`${HOST}:${port}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'GetBlockCount', params: {} }),
      timeout: 5000
    });
    const data = await res.json();
    console.log(`[PASS] ${name}: Block Height = ${data?.result?.index}`);
  } catch (e) {
    console.log(`[FAIL] ${name}: ${e.message}`);
  }
}

async function run() {
  await checkEndpoint(1926, 'Testnet (test)');
  await checkEndpoint(1927, 'Mainnet (staging)');
}

run();
