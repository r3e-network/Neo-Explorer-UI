const fs = require('fs');

let defaultConf = fs.readFileSync('default.conf', 'utf8');
defaultConf = defaultConf.replace(/https:\/\/neofura\.ngd\.network\//g, 'https://dora.coz.io/api/v1/neo3/mainnet/');
defaultConf = defaultConf.replace(/https:\/\/testmagnet\.ngd\.network\//g, 'https://dora.coz.io/api/v1/neo3/testnet/');
fs.writeFileSync('default.conf', defaultConf);

