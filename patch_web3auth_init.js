const fs = require('fs');
let code = fs.readFileSync('src/services/web3authService.js', 'utf8');

const targetStr = `const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID || "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiIQOAcQgLog7mFc0m_3tS90i6Ew6oNlE9Z4g"; 

export const web3authService = {
  /**
   * Initializes the Web3Auth instance and its Modal UI
   */
  async init() {
    if (_web3auth) return;
    try {
      _web3auth = new Web3Auth({
        clientId,
        web3AuthNetwork: import.meta.env.VITE_WEB3AUTH_NETWORK || "sapphire_devnet", // "sapphire_mainnet" for production
        chainConfig: {
          // Dummy generic EVM config just to satisfy Web3Auth's initial requirement.
          // We don't use this chain; we just extract the private key to derive a Neo N3 account.
          chainNamespace: CHAIN_NAMESPACES.EIP155,
          chainId: "0x1",
          rpcTarget: "https://rpc.ankr.com/eth",
        },
      });`;

const newStr = `const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID || "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiIQOAcQgLog7mFc0m_3tS90i6Ew6oNlE9Z4g"; 

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x1",
  rpcTarget: "https://rpc.ankr.com/eth",
  displayName: "Ethereum Mainnet",
  blockExplorerUrl: "https://etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
  logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
};

export const web3authService = {
  /**
   * Initializes the Web3Auth instance and its Modal UI
   */
  async init() {
    if (_web3auth) return;
    try {
      const privateKeyProvider = new EthereumPrivateKeyProvider({
        config: { chainConfig },
      });

      _web3auth = new Web3Auth({
        clientId,
        web3AuthNetwork: import.meta.env.VITE_WEB3AUTH_NETWORK || "sapphire_devnet", // "sapphire_mainnet" for production
        privateKeyProvider: privateKeyProvider,
      });`;

code = code.replace(targetStr, newStr);
fs.writeFileSync('src/services/web3authService.js', code);
