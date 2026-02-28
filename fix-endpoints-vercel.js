const fs = require('fs');

let vercelConfig = fs.readFileSync('vercel.json', 'utf8');

vercelConfig = vercelConfig.replace(/"dest": "https:\/\/neofura\.ngd\.network"/g, '"dest": "https://dora.coz.io/api/v1/neo3/mainnet"');
vercelConfig = vercelConfig.replace(/"dest": "https:\/\/testmagnet\.ngd\.network"/g, '"dest": "https://dora.coz.io/api/v1/neo3/testnet"');

fs.writeFileSync('vercel.json', vercelConfig);
