const fs = require('fs');

let testsConfig = fs.readFileSync('tests/config/endpoints.spec.js', 'utf8');

testsConfig = testsConfig.replace(/"https:\/\/neofura\.ngd\.network"/g, '"https://dora.coz.io/api/v1/neo3/mainnet"');
testsConfig = testsConfig.replace(/"https:\/\/testmagnet\.ngd\.network"/g, '"https://dora.coz.io/api/v1/neo3/testnet"');
testsConfig = testsConfig.replace(/"https:\/\/testmagnet\.ngd\.network\/bpi\/\$1"/g, '"https://dora.coz.io/api/v1/neo3/testnet/bpi/$1"');
testsConfig = testsConfig.replace(/"https:\/\/neofura\.ngd\.network\/bpi\/\$1"/g, '"https://dora.coz.io/api/v1/neo3/mainnet/bpi/$1"');

fs.writeFileSync('tests/config/endpoints.spec.js', testsConfig);
