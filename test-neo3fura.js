const fetch = require('node-fetch');

async function test() {
  const req = await fetch('http://198.244.215.132:1927', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'GetBlockList', params: { Limit: 1, Skip: 0 } })
  });
  const res = await req.json();
  console.log(res);
}
test();
