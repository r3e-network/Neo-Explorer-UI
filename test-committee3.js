const fetch = require('node-fetch');

async function test() {
  const req = await fetch('http://seed1.neo.org:10332', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getblock', params: [4800000, 1] })
  });
  const res = await req.json();
  console.log("RPC getblock primary:", res.result?.primary);
}
test();
