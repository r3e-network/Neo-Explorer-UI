const fetch = require('node-fetch');
fetch('http://seed1.neo.org:10332', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getnextblockvalidators', params: [] })
}).then(r => r.json()).then(res => {
  const validators = res.result;
  console.log("Validator list size:", validators.length);
  
  const doraEnv = 'mainnet';
  const url = `https://dora.coz.io/api/v1/neo3/${doraEnv}/committee`;
  fetch(url).then(r => r.json()).then(data => {
      const metaMap = {};
      data.forEach(item => {
        if (item.pubkey) metaMap[item.pubkey] = item;
      });
      
      const primaryIndex = 0; // Example
      const validator = validators[primaryIndex];
      const meta = metaMap[validator.publickey];
      console.log(`Primary ${primaryIndex} mapping:`, validator.publickey, "->", meta ? meta.name : "Unknown");
  });
});
