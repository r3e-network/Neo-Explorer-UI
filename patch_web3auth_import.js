const fs = require('fs');
let code = fs.readFileSync('src/services/web3authService.js', 'utf8');

const targetStr = `import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES } from "@web3auth/base";`;

// Web3Auth uses dynamic process/crypto variables under the hood which triggers "Une is not defined" from bundlers
// when the chunk is not correctly polyfilled for browser environments, or if it tries to minify a specific sub-dependency (like torus/ethereum-controllers).

// Since we're not actually using EVM features, let's make sure we configure it with no-op modal parameters.
const newStr = `import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";`;

code = code.replace(targetStr, newStr);

// I need to add ethereum-provider to package.json since Web3auth v7 separates it. Wait, the error is inside `ox-core` via `@toruslabs/ethereum-controllers`.
fs.writeFileSync('src/services/web3authService.js', code);
