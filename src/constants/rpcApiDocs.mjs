export const API_DOCS_RPC_CATEGORIES = [
  { key: "blocks", label: "Blocks" },
  { key: "transactions", label: "Transactions" },
  { key: "addresses", label: "Addresses" },
  { key: "tokens", label: "Tokens" },
  { key: "contracts", label: "Contracts" },
  { key: "governance", label: "Governance" },
  { key: "stats", label: "Stats & Traces" },
];

// JSON-RPC base selector for documented methods. The interactive docs expose
// standard Neo RPC calls that are served by the production RPC gateway.
export const RPC_METHOD_BASE = {
  rpc: "rpc",
  api: "api",
};

// UI annotation strings retained for any explicitly mainnet-only additions.
// Sourced from this owned constants module (not the i18n lang files) so the
// annotation ships without editing locale bundles.
export const RPC_MAINNET_ONLY_BADGE = "Mainnet only";
export const RPC_MAINNET_ONLY_NOTE =
  "This method is served only by the mainnet RPC surface.";

function resolveMethodBase(method) {
  return method.base || RPC_METHOD_BASE.rpc;
}

export const API_DOCS_RPC_METHODS = [
  {
    name: "getblockcount",
    desc: "Get the latest block height.",
    category: "blocks",
    params: [],
    type: "passthrough",
  },
  {
    name: "getblockhash",
    desc: "Get a block hash by height.",
    category: "blocks",
    params: [1],
    type: "passthrough",
  },
  {
    name: "getblock",
    desc: "Get a block by height or hash.",
    category: "blocks",
    params: [1, 1],
    type: "passthrough",
  },
  {
    name: "getrawtransaction",
    desc: "Get transaction detail by transaction hash.",
    category: "transactions",
    params: ["0x534033004dddda93d975bb823a228e6f995a96526608f03d74cdba8e44fe46d5", 1],
    type: "passthrough",
  },
  {
    name: "getnep17balances",
    desc: "Get NEP-17 balances for an address.",
    category: "addresses",
    params: ["NN8tbpgAx8zm5BNJZEqvi71Rj2Z8LX2RHh"],
    type: "passthrough",
  },
  {
    name: "getcontractstate",
    desc: "Get contract metadata and manifest state.",
    category: "contracts",
    params: ["0xd2a4cff31913016155e38e474a2c06d08be276cf"],
    type: "passthrough",
  },
  {
    name: "invokefunction",
    desc: "Native Neo RPC call, forwarded by neo3fura when not handled by indexed API.",
    category: "contracts",
    params: ["0xd2a4cff31913016155e38e474a2c06d08be276cf", "symbol", []],
    type: "passthrough",
  },
  {
    name: "getcandidates",
    desc: "Get consensus candidates list.",
    category: "governance",
    params: [],
    type: "passthrough",
  },
  {
    name: "getversion",
    desc: "Get node and protocol version information.",
    category: "stats",
    params: [],
    type: "passthrough",
  },
  {
    name: "getconnectioncount",
    desc: "Get the active peer connection count.",
    category: "stats",
    params: [],
    type: "passthrough",
  },
  {
    name: "getstateheight",
    desc: "Get the local and validated state root heights.",
    category: "stats",
    params: [],
    type: "passthrough",
  },
];

// Annotate each method with the origin base it must be sent to and whether it
// is mainnet-only. Consumers (ApiDocs.vue) template `base` into the request's
// endpoint path so a copy-pasted example targets a URL that actually serves
// the method.
for (const method of API_DOCS_RPC_METHODS) {
  method.base = resolveMethodBase(method);
  method.mainnetOnly = Boolean(method.mainnetOnly);
}

export const API_DOCS_RPC_PASSTHROUGH_METHODS = new Set(
  API_DOCS_RPC_METHODS.filter((method) => method.type === "passthrough").map((method) => method.name)
);

// Method names that must be sent to the /api/<network> edge-worker intercept
// rather than the /rpc origin-proxy.
export const API_DOCS_RPC_API_BASE_METHODS = new Set(
  API_DOCS_RPC_METHODS.filter((method) => method.base === RPC_METHOD_BASE.api).map((method) => method.name)
);
