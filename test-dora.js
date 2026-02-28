const fetch = require('node-fetch');
fetch('https://dora.coz.io/api/v1/neo3/mainnet/committee').then(r => r.json()).then(console.log).catch(console.error);
