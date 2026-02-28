const fetch = require('node-fetch');

async function test() {
  for (let i = 4800000; i < 4800010; i++) {
    const req = await fetch('http://seed1.neo.org:10332', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getblock', params: [i, 1] })
    });
    const res = await req.json();
    console.log(`Block ${i} primary: ${res.result?.primary} | ${i} % 7: ${i % 7}`);
  }
}
test();
