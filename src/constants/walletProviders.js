export const PROVIDERS = Object.freeze({
  NEOLINE: "NeoLine",
  ONEGATE: "OneGate",
  WALLETCONNECT: "WalletConnect",
  NEON: "Neon Wallet",
  TESTNET_WIF: "Testnet WIF (Local Dev)",
  WEB3AUTH: "Google / Email (Web3Auth)",
  EVM_WALLET: "EVM Wallets (MetaMask, OKX, Rabby, etc.)",
});

export const CONTRACT_WRITE_WALLET_PROVIDERS = Object.freeze([
  PROVIDERS.NEOLINE,
  PROVIDERS.ONEGATE,
  PROVIDERS.NEON,
  PROVIDERS.WALLETCONNECT,
  PROVIDERS.WEB3AUTH,
  PROVIDERS.EVM_WALLET,
]);
