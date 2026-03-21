const en = {
  nav: {
    home: "Home",
    blockchain: "Blockchain",
    blocks: "Blocks",
    transactions: "Transactions",
    accounts: "Accounts",
    consensusNodes: "Consensus Nodes",
    governance: "Governance",
    tokens: "Tokens",
    nep17: "NEP-17 Tokens",
    nep11: "NEP-11 NFTs",
    contracts: "Contracts",
    treasury: "Treasury",
    resources: "Resources",
    chartsStats: "Charts & Stats",
    gasTracker: "Gas Tracker",
    burnedGas: "Burned GAS",
    developers: "Developers",
    apiDocs: "API Docs",
    verifyContract: "Verify Contract",
    sourceCode: "Source Code",
  },

  homePage: {
    recentBlocks: "Latest Blocks",
    recentTxs: "Latest Transactions",
    seeAll: "See All",
  },
  common: {
    noDataAvailable: "No data available",
    loadingMore: "Loading more...",
    noMoreItems: "No more items to load",
  },
  pendingTx: {
    title: "Pending Transactions",
    empty: "No pending transactions",
    refreshing: "Refreshing...",
    refresh: "Refresh",
  },
  verify: {
    verifying: "Verifying contract...",
    serverError: "Server error, please try again later.",
    contractNotFound: "Failed in querying contract info on blockChain.",
    success: "Contract verification succeeded!",
    alreadyVerified: "This contract has already been verified.",
    mismatch: "Verification failed. Source code does not match deployed bytecode.",
    verificationFailed: "Verification failed.",
  },
  contract: {
    invocationFailed: "Invocation failed. Please check parameters and try again.",
    walletConnectFailed: "Failed to connect wallet",
    txFailed: "Transaction failed. Please check parameters.",
  },
  tools: {
    title: "Tools",
    subtitle: "Advanced utilities for interacting with Neo N3",
    multisig: {
      title: "Multi-Signature Wallet",
      description:
        "Create and manage multi-sig transactions, collect signatures from co-owners, and broadcast to the network.",
    },
    governance: {
      title: "Council Governance",
      description:
        "Official council tool to create proposals, manage network policies, and coordinate validator voting.",
    },
    contractInterface: {
      title: "Contract Interface",
      description: "Interact directly with deployed smart contracts, read state, and invoke methods.",
    },
    verifyContract: {
      title: "Verify Contract",
      description: "Upload source code to match on-chain bytecode, granting your contract a verified green checkmark.",
    },
    converter: {
      title: "Neo Formatter & Converter",
      description: "Easily convert between Base64, Hex strings, UTF-8 text, and ScriptHashes.",
      pageTitle: "Format Converter",
      pageSubtitle: "Convert between Base64, Hex, and Strings for Neo N3 parameters.",
      breadcrumb: "Neo Converter",
      inputType: "Input Type",
      convertTo: "Convert To",
      placeholder: "Paste value here...",
      stringUtf8: "String / UTF-8",
      hexString: "Hex String",
      base64: "Base64",
      base64Rpc: "Base64 (RPC Argument Format)",
      awaitingInput: "Awaiting Input",
      invalidInput: "Invalid input format",
      clearInput: "Clear input",
      copyToClipboard: "Copy to clipboard",
      copied: "Copied to clipboard!",
      copyFailed: "Failed to copy",
    },
    neofs: {
      title: "NeoFS Gateway",
      description:
        "Upload files to decentralized containers, search NeoFS object links, and manage your cloud storage.",
    },
    candidateProfile: {
      title: "Candidate Profile Manager",
      description:
        "Update on-chain validator identity, Dora metadata, and upload your official logo directly to NeoFS.",
    },
    broadcast: {
      title: "On-Chain Message",
      description:
        "Attach arbitrary data and permanent text messages to the Neo N3 blockchain using Transaction Remarks.",
    },
    sponsored: {
      title: "Sponsored Transactions",
      description: "Claim GAS or vote without paying fees via a designated sponsor wallet.",
    },
    deployer: {
      title: "Contract Deployer",
      description: "Directly upload and deploy pre-compiled .nef and manifest.json files to the network.",
    },
    factory: {
      title: "Contract Factory",
      description: "Configure and launch standard NEP-17 tokens, Meme coins, and NFT collections without writing code.",
    },
    abi: {
      title: "ABI Encoder / Decoder",
      description: "Encode contract payloads or disassemble raw hex scripts into readable instructions.",
    },
    storage: {
      title: "Storage Inspector",
      description: "Read the direct Key-Value storage state of any smart contract actively on Neo N3.",
    },
    gas: {
      title: "Gas Estimator",
      description: "Simulate a transaction execution and calculate the precise System and Network fee.",
    },
    mempool: {
      title: "Mempool Search",
      description: "Search and view the full list of in-memory pending transactions on the Neo network.",
    },
    alerts: {
      title: "Network Alerts",
      description: "Register for alerts regarding consensus delays, missed blocks, and account events.",
    },
    abstractAccount: {
      title: "Abstract Account Creator",
      description: "Generate zero-gas isolated proxy AA addresses linked to the global Unified Master Entry Contract.",
    },
  },
  errors: {
    loadBlocks: "Failed to load blocks. Please try again.",
    loadTransactions: "Failed to load transactions. Please try again.",
    loadCandidates: "Failed to load candidates. Please try again.",
    loadTokens: "Failed to load tokens. Please try again.",
    loadTokenBalances: "Failed to load token balances. Please try again.",
    loadNftDetails: "Failed to load NFT details. Please try again.",
    loadNftItems: "Failed to load NFT items. Please try again.",
    loadContracts: "Failed to load contracts. Please try again.",
    loadContractDetails: "Failed to load contract details. Please try again.",
    loadAccounts: "Failed to load accounts. Please try again.",
    loadBlockDetails: "Failed to load block details. Please try again.",
    loadTxDetails: "Failed to load transaction details.",
    loadAppLog: "Failed to load application log.",
    loadExecutionTrace: "Failed to load execution trace.",
    loadChartData: "Failed to load chart data. Please try again.",
    loadBurnMetrics: "Unable to load burn metrics. Please try again.",
    blockNotFound: "Block not found. The hash may be invalid.",
    tokenLoadFailed: "Failed to load token information. Please try again.",
    generic: "Something went wrong. Please try again.",
  },
};
export default en;
