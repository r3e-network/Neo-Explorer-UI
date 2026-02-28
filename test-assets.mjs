import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fetch = require('node-fetch');

async function testRpc() {
  const req0 = await fetch('https://neofura.ngd.network', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'GetAddressList', params: { Limit: 2, Skip: 0 } })
    });
  const res0 = await req0.json();
  const addr = res0.result.result[0].address;

  const req = await fetch('https://neofura.ngd.network', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'GetAssetsHeldByAddress', params: { Address: addr } })
    });
  const res = await req.json();
  console.log("ADDR", addr);
  console.log("ASSETS", JSON.stringify(res, null, 2));
}

testRpc();
