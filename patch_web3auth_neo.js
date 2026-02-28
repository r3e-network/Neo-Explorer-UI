const fs = require('fs');
let code = fs.readFileSync('src/services/web3authService.js', 'utf8');

const importsTarget = `import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";`;

const newImports = `import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";`;

code = code.replace(importsTarget, newImports);

const chainConfigTarget = `const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x1",
  rpcTarget: "https://cloudflare-eth.com",
  displayName: "Ethereum Mainnet",
  blockExplorerUrl: "https://etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
  logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
};`;

const newChainConfig = `const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.OTHER,
  chainId: "0x334E", // "334E" is hex for N3 Mainnet (13134), though Web3Auth ignores this for OTHER
  rpcTarget: "https://mainnet1.neo.coz.io:443",
  displayName: "Neo N3 Mainnet",
  blockExplorerUrl: "https://neo3scan.com",
  ticker: "GAS",
  tickerName: "Neo GAS",
  logo: "https://neo3scan.com/img/brand/neo.png",
};`;

code = code.replace(chainConfigTarget, newChainConfig);

const providerInitTarget = `      const privateKeyProvider = new EthereumPrivateKeyProvider({
        config: { chainConfig },
      });`;

const newProviderInit = `      const privateKeyProvider = new CommonPrivateKeyProvider({
        config: { chainConfig },
      });`;

code = code.replace(providerInitTarget, newProviderInit);

fs.writeFileSync('src/services/web3authService.js', code);
