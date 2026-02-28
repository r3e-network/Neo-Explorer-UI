const fs = require('fs');

let code = fs.readFileSync('src/services/web3authService.js', 'utf8');

const targetId = `const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID || "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiIQOAcQgLog7mFc0m_3tS90i6Ew6oNlE9Z4g";`;
const newId = `const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID || "BAFNBNPk7tUWbM9L6TBy7ixKCSQ3QwmQ7mCj0r3ai3KBA9ITqb3d7ifD0BV5YDs3NQCLPFU83MptKVc4T_xBMpo";`;

code = code.replace(targetId, newId);

const targetNetwork = `_web3auth = new Web3Auth({
        clientId,
        web3AuthNetwork: import.meta.env.VITE_WEB3AUTH_NETWORK || "sapphire_devnet", // "sapphire_mainnet" for production
        privateKeyProvider: privateKeyProvider,
      });`;

const newNetwork = `_web3auth = new Web3Auth({
        clientId,
        web3AuthNetwork: import.meta.env.VITE_WEB3AUTH_NETWORK || "sapphire_mainnet", // Set to sapphire_mainnet as default for Neo3Scan production
        privateKeyProvider: privateKeyProvider,
      });`;

code = code.replace(targetNetwork, newNetwork);
fs.writeFileSync('src/services/web3authService.js', code);
