import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fetch = require('node-fetch');

async function testRpc() {
  const req = await fetch('https://neofura.ngd.network', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'GetDailyTransactions', params: { Days: 7 } })
  });
  const res = await req.json();
  console.log(JSON.stringify(res, null, 2));
}

testRpc();
