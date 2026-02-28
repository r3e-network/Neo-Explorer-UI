const fetch = require('node-fetch');
async function test() {
  const req = await fetch('http://198.244.215.132:1926', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getnextblockvalidators', params: [] })
  });
  const res = await req.json();
  console.log("neo3fura testnet:", JSON.stringify(res, null, 2));
}
test();
