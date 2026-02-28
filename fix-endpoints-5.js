const fs = require('fs');

let testsConfig = fs.readFileSync('tests/config/endpoints.spec.js', 'utf8');

testsConfig = testsConfig.replace(/'const DEFAULT_MAINNET_BPI_PROXY_TARGET = "https:\/\/dora\.coz\.io\/api\/v1\/neo3\/mainnet";'/, '\'const DEFAULT_MAINNET_BPI_PROXY_TARGET = "https://neofura.ngd.network";\'');
testsConfig = testsConfig.replace(/'const DEFAULT_TESTNET_BPI_PROXY_TARGET = "https:\/\/dora\.coz\.io\/api\/v1\/neo3\/testnet";'/, '\'const DEFAULT_TESTNET_BPI_PROXY_TARGET = "https://testmagnet.ngd.network";\'');

testsConfig = testsConfig.replace(/expect\(routeDest\("\/bpi\/mainnet\/\(\.\*\)"\)\)\.toBe\("https:\/\/dora\.coz\.io\/api\/v1\/neo3\/mainnet\/bpi\/\$1"\);/, 'expect(routeDest("/bpi/mainnet/(.*)")).toBe("https://neofura.ngd.network/bpi/$1");');
testsConfig = testsConfig.replace(/expect\(routeDest\("\/bpi\/testnet\/\(\.\*\)"\)\)\.toBe\("https:\/\/dora\.coz\.io\/api\/v1\/neo3\/testnet\/bpi\/\$1"\);/, 'expect(routeDest("/bpi/testnet/(.*)")).toBe("https://testmagnet.ngd.network/bpi/$1");');

fs.writeFileSync('tests/config/endpoints.spec.js', testsConfig);
