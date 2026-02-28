const { rpc } = require('@cityofzion/neon-js');
const fetch = require('node-fetch');

async function test() {
  const req = await fetch('http://seed1.neo.org:10332', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getblock', params: [5058196, 1] })
  });
  const res = await req.json();
  const primary = res.result?.primary;
  
  const vReq = await fetch('http://seed1.neo.org:10332', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getnextblockvalidators', params: [] })
  });
  const vRes = await vReq.json();
  const valCount = vRes.result?.length || 7;
  
  console.log(`Block 5058196 -> RPC primary: ${primary}, index % ${valCount} = ${5058196 % valCount}`);
}
test();
