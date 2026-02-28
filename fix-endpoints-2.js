const fs = require('fs');

let viteConfig = fs.readFileSync('vite.config.js', 'utf8');

viteConfig = viteConfig.replace(/"\/api\/mainnet\/primary": \{\n          target: "https:\/\/neofura\.ngd\.network",/, '"/api/mainnet/primary": {\n          target: "https://dora.coz.io/api/v1/neo3/mainnet",');
viteConfig = viteConfig.replace(/"\/api\/mainnet\/fallback": \{\n          target: "https:\/\/neofura\.ngd\.network",/, '"/api/mainnet/fallback": {\n          target: "https://dora.coz.io/api/v1/neo3/mainnet",');
viteConfig = viteConfig.replace(/"\/api\/testnet\/primary": \{\n          target: "https:\/\/testmagnet\.ngd\.network",/, '"/api/testnet/primary": {\n          target: "https://dora.coz.io/api/v1/neo3/testnet",');
viteConfig = viteConfig.replace(/"\/api\/testnet\/fallback": \{\n          target: "https:\/\/testmagnet\.ngd\.network",/, '"/api/testnet/fallback": {\n          target: "https://dora.coz.io/api/v1/neo3/testnet",');

fs.writeFileSync('vite.config.js', viteConfig);
