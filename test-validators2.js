const fetch = require('node-fetch');

// This script verifies the getnextblockvalidators payload locally

async function testIt() {
  const req = await fetch('http://seed1.neo.org:10332', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getnextblockvalidators', params: [] })
  });
  const res = await req.json();
  const validators = res.result || [];
  
  const doraEnv = 'mainnet';
  const url = `https://dora.coz.io/api/v1/neo3/${doraEnv}/committee`;
  const metaReq = await fetch(url);
  const data = await metaReq.json();
  
  const metaMap = {};
  data.forEach(item => {
    if (item.pubkey) metaMap[item.pubkey] = item;
  });
  
  const primaryIndex = 0; // The actual primary index from a recent block
  
  console.log("Validator List mapped from RPC array:");
  validators.forEach((v, index) => {
    console.log(`Index ${index}:`, metaMap[v.publickey] ? metaMap[v.publickey].name : v.publickey);
  });
}

testIt().catch(console.error);
