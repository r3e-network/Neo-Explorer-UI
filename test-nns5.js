const fetch = require('node-fetch');
async function run() {
  const query = 'jimmy.neo';
  const req = await fetch('http://seed1.neo.org:10332', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      jsonrpc: '2.0', 
      id: 1, 
      method: 'invokefunction', 
      params: [
        '0x50ac1c37690cc2cfc594472833cf57505d5f46de', 
        'properties', 
        [{"type":"ByteArray","value": Buffer.from(query).toString('base64')}]
      ] 
    })
  });
  const res = await req.json();
  console.log(JSON.stringify(res, null, 2));
}
run();
