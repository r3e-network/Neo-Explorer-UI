const fs = require('fs');
let code = fs.readFileSync('src/services/web3authService.js', 'utf8');

const targetConfig = `const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.OTHER,
  chainId: "0x334E", // "334E" is hex for N3 Mainnet (13134), though Web3Auth ignores this for OTHER
  rpcTarget: "https://mainnet1.neo.coz.io:443",
  displayName: "Neo N3 Mainnet",
  blockExplorerUrl: "https://neo3scan.com",
  ticker: "GAS",
  tickerName: "Neo GAS",
  logo: "https://neo3scan.com/img/brand/neo.png",
};`;

// Dynamically handle testnet vs mainnet using your existing env utility
const newConfig = `import { getCurrentEnv } from "@/utils/env";

const getChainConfig = () => {
  const isTestnet = getCurrentEnv().toLowerCase().includes("test") || getCurrentEnv().toLowerCase().includes("t5");
  
  return {
    chainNamespace: CHAIN_NAMESPACES.OTHER,
    chainId: isTestnet ? "0x3354" : "0x334E", // Hex representation for Testnet (13140) / Mainnet (13134)
    rpcTarget: isTestnet ? "https://testnet1.neo.coz.io:443" : "https://mainnet1.neo.coz.io:443",
    displayName: isTestnet ? "Neo N3 Testnet" : "Neo N3 Mainnet",
    blockExplorerUrl: "https://neo3scan.com",
    ticker: "GAS",
    tickerName: "Neo GAS",
    logo: "https://neo3scan.com/img/brand/neo.png",
  };
};`;

code = code.replace(targetConfig, newConfig);

// Then update init to call the dynamic config
code = code.replace('config: { chainConfig },', 'config: { chainConfig: getChainConfig() },');

fs.writeFileSync('src/services/web3authService.js', code);
