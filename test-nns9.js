const fetch = require('node-fetch');
async function run() {
  const query = 'jimmy.neo';
  const tokenIdHex = Array.from(query).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  console.log("TokenIds:", [tokenIdHex]);
  const req = await fetch('http://198.244.215.132:1927', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'GetNep11PropertiesByContractHashTokenId', params: { ContractHash: '0x50ac1c37690cc2cfc594472833cf57505d5f46de', TokenId: [tokenIdHex] } })
  });
  console.log(req.status, req.statusText);
  const text = await req.text();
  console.log(text);
}
run();
