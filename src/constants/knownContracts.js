import { FLAMINGO_TOKEN_CONTRACTS } from "./flamingoTokens";

const STATIC_KNOWN_CONTRACTS = {
  // Name Service Contracts (.neo / .matrix)
  "0x50ac1c37690cc2cfc594472833cf57505d5f46de": {
    name: "Neo Name Service",
    symbol: "NNS",
    logo: "https://neo.link/_next/static/media/nnslogo.1314e9b5.svg",
  },
  "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd": {
    name: "Matrix Name Service",
    symbol: "MATRIX",
    // Keep matrix visual identity aligned with NNS as requested.
    logo: "https://neo.link/_next/static/media/nnslogo.1314e9b5.svg",
  },
  "0x89908093c5ccc463e2c5744d6bacb06108b60a75": {
    name: "Matrix Name Service (Testnet)",
    symbol: "MATRIX",
    logo: "https://neo.link/_next/static/media/nnslogo.1314e9b5.svg",
  },

  // Flamingo Finance non-token contracts
  "0xec268efc0f4fce9d3afbcfb5c00d43328e895d4d": { name: "FlamingoBroker", logo: "https://flamingo.finance/favicon.ico" },
  "0x8b321a6edfaecbc4703bbaec05bf87da6a908da9": { name: "FlamingoRouter", logo: "https://flamingo.finance/favicon.ico" },
  "0x1f3cce2dc1fc7a7266a2e4e1a123f11dcd4e29cc": { name: "FlamingoSwapPair", logo: "https://flamingo.finance/favicon.ico" },
  "0xd1a9f78e1940f6322fef4df2340a963a9ec46f63": { name: "FlamingoStaking", logo: "https://flamingo.finance/favicon.ico" },
  "0xc39f2ebdf116345d94726cd551ddb4fbcc5dd3da": { name: "FlamingoStaking", logo: "https://flamingo.finance/favicon.ico" },

  // NeoBurger Contracts
  "0x48c40d4666f93408be1bef038b6722404d9a4c2a": { name: "bNEO", symbol: "bNEO", decimals: 8, logo: "https://app.neoburger.io/favicon.ico" },
  "0xb396038a8e1b102925b42d2a45d0ed37dfd1fc1d": { name: "BurgerAgent", logo: "https://app.neoburger.io/favicon.ico" },
  "0xf21df748881273ff3725cf9e1d8cd3b3a62854b4": { name: "NeoBurger", logo: "https://app.neoburger.io/favicon.ico" },

  // NeoX Bridge Contracts
  "0xbb19cfc864b73159277e1fd39694b3fd5fc613d2": { name: "NeoXBridge", logo: "https://x.neo.org/favicon.ico" },
  "0x148b3e0ca4f77476252862645e58f06b2562c414": { name: "NeoXBridgeManagement", logo: "https://x.neo.org/favicon.ico" },
};

export const KNOWN_CONTRACTS = {
  ...FLAMINGO_TOKEN_CONTRACTS,
  ...STATIC_KNOWN_CONTRACTS,
};
