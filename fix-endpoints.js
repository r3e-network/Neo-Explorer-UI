const fs = require('fs');

let viteConfig = fs.readFileSync('vite.config.js', 'utf8');
viteConfig = viteConfig.replace(/const DEFAULT_MAINNET_RPC_PROXY_TARGET = "https:\/\/neofura\.ngd\.network";/, 'const DEFAULT_MAINNET_RPC_PROXY_TARGET = "https://dora.coz.io/api/v1/neo3/mainnet";');
viteConfig = viteConfig.replace(/const DEFAULT_TESTNET_RPC_PROXY_TARGET = "https:\/\/testmagnet\.ngd\.network";/, 'const DEFAULT_TESTNET_RPC_PROXY_TARGET = "https://dora.coz.io/api/v1/neo3/testnet";');
fs.writeFileSync('vite.config.js', viteConfig);
