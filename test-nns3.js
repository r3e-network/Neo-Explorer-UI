const fetch = require('node-fetch');
async function run() {
  const query = 'jimmy.neo';
  const tokenIdHex = Array.from(query).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  const req = await fetch('https://neofura.ngd.network', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'GetNep11PropertiesByContractHashTokenId', params: { ContractHash: '0x50ac1c37690cc2cfc594472833cf57505d5f46de', TokenId: tokenIdHex } })
  });
  const res = await req.json();
  console.log(JSON.stringify(res, null, 2));
}
run();
