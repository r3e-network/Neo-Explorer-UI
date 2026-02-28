const fetch = require('node-fetch');
async function run() {
  const req = await fetch('https://neofura.ngd.network', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'GetNNSResolve', params: { Domain: 'jimmy.neo' } })
  });
  const res = await req.json();
  console.log(JSON.stringify(res, null, 2));
}
run();
