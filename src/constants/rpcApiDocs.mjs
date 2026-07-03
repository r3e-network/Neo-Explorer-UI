export const API_DOCS_RPC_CATEGORIES = [
  { key: "blocks", label: "Blocks" },
  { key: "transactions", label: "Transactions" },
  { key: "addresses", label: "Addresses" },
  { key: "tokens", label: "Tokens" },
  { key: "contracts", label: "Contracts" },
  { key: "governance", label: "Governance" },
  { key: "stats", label: "Stats & Traces" },
];

// JSON-RPC base selector for a documented method. The two origins serve
// different method sets (#18):
//   - "rpc": the /rpc origin-proxy, a bare NEO-GO node. Serves only the
//     standard NEO-GO RPC methods (invokefunction, getblockcount, ...).
//   - "api": the /api/<network> edge-worker intercept. The ONLY origin that
//     answers the legacy indexed Get* methods and the getvalidatedstateroot
//     helper. These intercepts exist on mainnet only — testnet /api points at
//     a plain node that rejects every indexed method — so they are annotated
//     mainnet-only.
export const RPC_METHOD_BASE = {
  rpc: "rpc",
  api: "api",
};

// UI annotation strings for the /api-only, mainnet-only indexed method group.
// Sourced from this owned constants module (not the i18n lang files) so the
// annotation ships without editing locale bundles.
export const RPC_MAINNET_ONLY_BADGE = "Mainnet only";
export const RPC_MAINNET_ONLY_NOTE =
  "This method is served only by the /api/<network> intercept on mainnet. Testnet /api points at a plain NEO-GO node that rejects indexed methods.";

// A method targets the /api intercept when it is an indexed Get* method OR the
// getvalidatedstateroot helper (a passthrough-typed method that nonetheless
// only exists as the /api intercept, never on the bare /rpc node).
function resolveMethodBase(method) {
  if (method.type === "indexed") return RPC_METHOD_BASE.api;
  if (method.name === "getvalidatedstateroot") return RPC_METHOD_BASE.api;
  return RPC_METHOD_BASE.rpc;
}

export const API_DOCS_RPC_METHODS = [
  {
    name: "GetBlockCount",
    desc: "Get the latest block height.",
    category: "blocks",
    params: {},
    type: "indexed",
  },
  {
    name: "GetBlockInfoList",
    desc: "Get paginated block summaries.",
    category: "blocks",
    params: { Limit: 20, Skip: 0 },
    type: "indexed",
  },
  {
    name: "GetBlockByBlockHash",
    desc: "Get a block by hash.",
    category: "blocks",
    params: { BlockHash: "0x..." },
    type: "indexed",
  },
  {
    name: "GetTransactionCount",
    desc: "Get total number of indexed transactions.",
    category: "transactions",
    params: {},
    type: "indexed",
  },
  {
    name: "GetTransactionList",
    desc: "Get paginated transaction list.",
    category: "transactions",
    params: { Limit: 20, Skip: 0 },
    type: "indexed",
  },
  {
    name: "GetRawTransactionByTransactionHash",
    desc: "Get transaction detail by tx hash.",
    category: "transactions",
    params: { TransactionHash: "0x..." },
    type: "indexed",
  },
  {
    name: "GetAddressByAddress",
    desc: "Get address summary by wallet address.",
    category: "addresses",
    params: { Address: "N..." },
    type: "indexed",
  },
  {
    name: "GetAssetsHeldByAddress",
    desc: "Get assets currently held by address.",
    category: "addresses",
    params: { Address: "N..." },
    type: "indexed",
  },
  {
    name: "GetNep17TransferByAddress",
    desc: "Get NEP-17 transfer history by address.",
    category: "addresses",
    params: { Address: "N...", Limit: 20, Skip: 0 },
    type: "indexed",
  },
  {
    name: "GetAssetInfos",
    desc: "Get paginated token list.",
    category: "tokens",
    params: { Limit: 20, Skip: 0 },
    type: "indexed",
  },
  {
    name: "GetAssetInfoByContractHash",
    desc: "Get token metadata by contract hash.",
    category: "tokens",
    params: { ContractHash: "0x..." },
    type: "indexed",
  },
  {
    name: "GetAssetHoldersByContractHash",
    desc: "Get top holders for a token contract.",
    category: "tokens",
    params: { ContractHash: "0x...", Limit: 20, Skip: 0 },
    type: "indexed",
  },
  {
    name: "GetContractByContractHash",
    desc: "Get contract detail and manifest.",
    category: "contracts",
    params: { ContractHash: "0x..." },
    type: "indexed",
  },
  {
    name: "GetContractList",
    desc: "Get paginated contract list.",
    category: "contracts",
    params: { Limit: 20, Skip: 0 },
    type: "indexed",
  },
  {
    name: "invokefunction",
    desc: "Native Neo RPC call, forwarded by neo3fura when not handled by indexed API.",
    category: "contracts",
    params: ["0xcontract", "methodName", []],
    type: "passthrough",
  },
  {
    name: "getvalidatedstateroot",
    desc: "n3index helper that returns the newest StateValidator-covered StateService root.",
    category: "stats",
    params: { WithWitnesses: false },
    type: "passthrough",
  },
  {
    name: "GetCandidate",
    desc: "Get consensus candidates list.",
    category: "governance",
    params: { Limit: 20, Skip: 0 },
    type: "indexed",
  },
  {
    name: "GetCandidateByAddress",
    desc: "Get candidate detail by validator address.",
    category: "governance",
    params: { Address: "N..." },
    type: "indexed",
  },
  {
    name: "GetVotersByCandidateAddress",
    desc: "Get voters for a candidate.",
    category: "governance",
    params: { Address: "N...", Limit: 20, Skip: 0 },
    type: "indexed",
  },
  {
    name: "GetApplicationLogByTransactionHash",
    desc: "Get transaction execution log by tx hash.",
    category: "stats",
    params: { TransactionHash: "0x..." },
    type: "indexed",
  },
  {
    name: "GetExecutionByTransactionHash",
    desc: "Get indexed execution metadata by tx hash.",
    category: "stats",
    params: { TransactionHash: "0x..." },
    type: "indexed",
  },
];

// Annotate each method with the origin base it must be sent to and whether it
// is mainnet-only. Consumers (ApiDocs.vue) template `base` into the request's
// endpoint path so a copy-pasted example targets a URL that actually serves
// the method.
for (const method of API_DOCS_RPC_METHODS) {
  method.base = resolveMethodBase(method);
  // Only the /api intercept group is mainnet-restricted; the standard NEO-GO
  // /rpc methods work on both networks.
  method.mainnetOnly = method.base === RPC_METHOD_BASE.api;
}

export const API_DOCS_RPC_PASSTHROUGH_METHODS = new Set(
  API_DOCS_RPC_METHODS.filter((method) => method.type === "passthrough").map((method) => method.name)
);

// Method names that must be sent to the /api/<network> edge-worker intercept
// rather than the /rpc origin-proxy.
export const API_DOCS_RPC_API_BASE_METHODS = new Set(
  API_DOCS_RPC_METHODS.filter((method) => method.base === RPC_METHOD_BASE.api).map((method) => method.name)
);
