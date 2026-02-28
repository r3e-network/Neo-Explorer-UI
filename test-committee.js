const { rpc } = require('@cityofzion/neon-js');
const fetch = require('node-fetch');

async function test() {
  const req = await fetch('https://neofura.ngd.network', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'GetBlockList', params: { Limit: 5, Skip: 0 } })
  });
  const res = await req.json();
  const blocks = res.result?.result || res.result || [];
  
  console.log("Blocks primary values:", blocks.map(b => b.primary));
}
test();
