const fetch = require('node-fetch');
async function run() {
  for (let skip = 0; skip < 5000; skip += 500) {
    const req = await fetch('https://neofura.ngd.network', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'GetAssetInfoList', params: { Limit: 500, Skip: skip } })
    });
    const res = await req.json();
    if (res.result) {
      const tokens = res.result.result || res.result;
      if (!Array.isArray(tokens)) {
         console.log(tokens); continue;
      }
      for (const t of tokens) {
        if (t.symbol && (t.symbol.toLowerCase().includes('frank') || (t.tokenname && t.tokenname.toLowerCase().includes('frank')) || t.symbol.toLowerCase() === 'flm')) {
          console.log(t.hash, t.symbol, t.tokenname);
        }
      }
    }
  }
}
run();
