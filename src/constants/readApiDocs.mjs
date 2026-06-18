// Documentation data for the Neo Explorer Read-API REST endpoints.
// These are the Postgres-backed endpoints that replaced the legacy Mongo
// JSON-RPC Get* methods. The base URL is https://api.n3index.dev (or
// same-origin /data/<network> and /rest/<network> from the explorer SPA).
//
// Each endpoint lists path params, query params, and a copy-pasteable curl
// example. Grouped by category for the /api-docs page.

export const READ_API_BASE = "https://api.n3index.dev";

export const READ_API_CATEGORIES = [
  { key: "network", label: "Network" },
  { key: "blocks", label: "Blocks" },
  { key: "transactions", label: "Transactions" },
  { key: "accounts", label: "Accounts" },
  { key: "contracts", label: "Contracts" },
  { key: "tokens", label: "Tokens" },
  { key: "governance", label: "Governance" },
  { key: "analytics", label: "Analytics & Metadata" },
  { key: "rest", label: "REST Compatibility" },
  { key: "realtime", label: "Realtime (SSE)" },
];

// Common query params reused across list endpoints.
const PAGINATION = [
  { name: "limit", type: "integer", desc: "Max rows per page (default 20, max 200)." },
  { name: "offset", type: "integer", desc: "Pagination offset (default 0)." },
];

export const READ_API_ENDPOINTS = [
  // Network
  {
    category: "network",
    method: "GET",
    path: "/v1/status/platform",
    desc: "Platform status for mainnet and testnet: aggregate readiness, per-network lag, freshness, and degradation reason.",
    pathParams: [],
    queryParams: [],
    example: `curl -s "${READ_API_BASE}/v1/status/platform"`,
  },
  {
    category: "network",
    method: "GET",
    path: "/v1/networks/{network}/status",
    desc: "Indexer status: last indexed block, chain tip, lag, freshness.",
    pathParams: [{ name: "network", desc: "mainnet | testnet" }],
    queryParams: [],
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/status"`,
  },
  {
    category: "network",
    method: "GET",
    path: "/v1/networks/{network}/summary",
    desc: "Network summary counters (block/tx/contract/token counts).",
    pathParams: [{ name: "network", desc: "mainnet | testnet" }],
    queryParams: [],
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/summary"`,
  },
  {
    category: "network",
    method: "GET",
    path: "/v1/networks/{network}/stats",
    desc: "Aggregate transaction count for the network.",
    pathParams: [{ name: "network", desc: "mainnet | testnet" }],
    queryParams: [],
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/stats"`,
  },
  {
    category: "network",
    method: "GET",
    path: "/healthz",
    desc: "Service health check. Returns {\"ok\":true}.",
    pathParams: [],
    queryParams: [],
    example: `curl -s "${READ_API_BASE}/healthz"`,
  },

  // Blocks
  {
    category: "blocks",
    method: "GET",
    path: "/v1/networks/{network}/blocks",
    desc: "Paginated list of recent blocks.",
    pathParams: [{ name: "network", desc: "mainnet | testnet" }],
    queryParams: PAGINATION,
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/blocks?limit=10"`,
  },
  {
    category: "blocks",
    method: "GET",
    path: "/v1/networks/{network}/blocks/{indexOrHash}",
    desc: "Block detail by height or hash.",
    pathParams: [
      { name: "network", desc: "mainnet | testnet" },
      { name: "indexOrHash", desc: "Block height (integer) or hash (0x...)" },
    ],
    queryParams: [],
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/blocks/10770000"`,
  },
  {
    category: "blocks",
    method: "GET",
    path: "/v1/networks/{network}/blocks/{height}/state-reads",
    desc: "State reads recorded during a block (system contract calls).",
    pathParams: [
      { name: "network", desc: "mainnet | testnet" },
      { name: "height", desc: "Block height" },
    ],
    queryParams: [],
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/blocks/10770000/state-reads"`,
  },

  // Transactions
  {
    category: "transactions",
    method: "GET",
    path: "/v1/networks/{network}/transactions",
    desc: "Paginated list of recent transactions.",
    pathParams: [{ name: "network", desc: "mainnet | testnet" }],
    queryParams: PAGINATION,
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/transactions?limit=10"`,
  },
  {
    category: "transactions",
    method: "GET",
    path: "/v1/networks/{network}/transactions/{txid}",
    desc: "Transaction detail by hash.",
    pathParams: [
      { name: "network", desc: "mainnet | testnet" },
      { name: "txid", desc: "Transaction hash (0x...)" },
    ],
    queryParams: [],
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/transactions/0x<txid>"`,
  },

  // Accounts
  {
    category: "accounts",
    method: "GET",
    path: "/v1/networks/{network}/accounts/{address}",
    desc: "Account overview (NEO/GAS balance, tx counts, first/last seen).",
    pathParams: [
      { name: "network", desc: "mainnet | testnet" },
      { name: "address", desc: "Neo N3 base58 address or 0x script hash" },
    ],
    queryParams: [],
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/accounts/NXqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp"`,
  },
  {
    category: "accounts",
    method: "GET",
    path: "/v1/networks/{network}/accounts/{address}/transactions",
    desc: "Transactions sent or signed by an address.",
    pathParams: [
      { name: "network", desc: "mainnet | testnet" },
      { name: "address", desc: "Neo N3 address" },
    ],
    queryParams: PAGINATION,
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/accounts/NXqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp/transactions?limit=5"`,
  },
  {
    category: "accounts",
    method: "GET",
    path: "/v1/networks/{network}/accounts/{address}/transfers",
    desc: "NEP-17/NEP-11 token transfers involving an address.",
    pathParams: [
      { name: "network", desc: "mainnet | testnet" },
      { name: "address", desc: "Neo N3 address" },
    ],
    queryParams: [...PAGINATION, { name: "standard", type: "string", desc: "Filter: nep17 | nep11" }],
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/accounts/NXqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp/transfers?limit=5"`,
  },
  {
    category: "accounts",
    method: "GET",
    path: "/v1/networks/{network}/accounts/{address}/balances",
    desc: "Current NEP-17 token balances for an address.",
    pathParams: [
      { name: "network", desc: "mainnet | testnet" },
      { name: "address", desc: "Neo N3 address" },
    ],
    queryParams: [],
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/accounts/NXqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp/balances"`,
  },

  // Contracts
  {
    category: "contracts",
    method: "GET",
    path: "/v1/networks/{network}/contracts",
    desc: "Paginated list of deployed contracts.",
    pathParams: [{ name: "network", desc: "mainnet | testnet" }],
    queryParams: [...PAGINATION, { name: "search", type: "string", desc: "Filter by name/hash" }],
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/contracts?limit=10"`,
  },
  {
    category: "contracts",
    method: "GET",
    path: "/v1/networks/{network}/contracts/{contractHash}",
    desc: "Contract detail (manifest, name, verified status).",
    pathParams: [
      { name: "network", desc: "mainnet | testnet" },
      { name: "contractHash", desc: "Contract hash (0x...)" },
    ],
    queryParams: [],
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/contracts/0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5"`,
  },
  {
    category: "contracts",
    method: "GET",
    path: "/v1/networks/{network}/contracts/{contractHash}/calls",
    desc: "Smart-contract method calls (invocations) for a contract.",
    pathParams: [
      { name: "network", desc: "mainnet | testnet" },
      { name: "contractHash", desc: "Contract hash" },
    ],
    queryParams: PAGINATION,
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/contracts/0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5/calls?limit=5"`,
  },
  {
    category: "contracts",
    method: "GET",
    path: "/v1/networks/{network}/contracts/{contractHash}/events",
    desc: "Notifications emitted by a contract.",
    pathParams: [
      { name: "network", desc: "mainnet | testnet" },
      { name: "contractHash", desc: "Contract hash" },
    ],
    queryParams: [...PAGINATION, { name: "event_name", type: "string", desc: "Filter by event name" }],
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/contracts/0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5/events?limit=5"`,
  },

  // Tokens
  {
    category: "tokens",
    method: "GET",
    path: "/v1/networks/{network}/tokens",
    desc: "Paginated list of NEP-17/NEP-11 tokens.",
    pathParams: [{ name: "network", desc: "mainnet | testnet" }],
    queryParams: [...PAGINATION, { name: "standard", type: "string", desc: "Filter: nep17 | nep11" }],
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/tokens?standard=nep17&limit=10"`,
  },
  {
    category: "tokens",
    method: "GET",
    path: "/v1/networks/{network}/tokens/{contractHash}",
    desc: "Token detail (symbol, decimals, total supply).",
    pathParams: [
      { name: "network", desc: "mainnet | testnet" },
      { name: "contractHash", desc: "Token contract hash" },
    ],
    queryParams: [],
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/tokens/0xd2a4cff31913016155e38e474a2c06d08be276cf"`,
  },
  {
    category: "tokens",
    method: "GET",
    path: "/v1/networks/{network}/tokens/{contractHash}/holders",
    desc: "Top token holders ranked by balance.",
    pathParams: [
      { name: "network", desc: "mainnet | testnet" },
      { name: "contractHash", desc: "Token contract hash" },
    ],
    queryParams: PAGINATION,
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/tokens/0xd2a4cff31913016155e38e474a2c06d08be276cf/holders?limit=10"`,
  },

  // Governance
  {
    category: "governance",
    method: "GET",
    path: "/v1/networks/{network}/governance/voters",
    desc: "Current voters for a candidate (derived from NEO Vote notifications).",
    pathParams: [{ name: "network", desc: "mainnet | testnet" }],
    queryParams: [
      { name: "candidate", type: "string", desc: "Candidate public key (33-byte hex, required)." },
      ...PAGINATION,
    ],
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/governance/voters?candidate=0239a37436652f41b3b802ca44cbcb7d65d3aa0b88c9a0380243bdbe1aaa5cb35b&limit=5"`,
  },

  // Analytics & Metadata
  {
    category: "analytics",
    method: "GET",
    path: "/v1/networks/{network}/analytics/daily",
    desc: "Daily chain analytics (tx count, address activity, gas burned).",
    pathParams: [{ name: "network", desc: "mainnet | testnet" }],
    queryParams: [{ name: "days", type: "integer", desc: "Number of days (default 30, max 365)." }],
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/analytics/daily?days=7"`,
  },
  {
    category: "analytics",
    method: "GET",
    path: "/v1/networks/{network}/metadata/validators",
    desc: "Validator/committee metadata (display names, logos, votes).",
    pathParams: [{ name: "network", desc: "mainnet | testnet" }],
    queryParams: [],
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/metadata/validators"`,
  },
  {
    category: "analytics",
    method: "GET",
    path: "/v1/networks/{network}/nns/domains",
    desc: "Registered NNS (.neo) domains.",
    pathParams: [{ name: "network", desc: "mainnet | testnet" }],
    queryParams: PAGINATION,
    example: `curl -s "${READ_API_BASE}/v1/networks/mainnet/nns/domains?limit=10"`,
  },

  // REST Compatibility (PostgREST-style, require network=eq.<net>)
  {
    category: "rest",
    method: "GET",
    path: "/rest/v1/contract_calls",
    desc: "REST-compat contract calls table (requires network=eq.<net>).",
    pathParams: [],
    queryParams: [
      { name: "network", type: "string", desc: "eq.mainnet | eq.testnet (required)." },
      { name: "contract_hash", type: "string", desc: "eq.0x... (optional filter)." },
      { name: "limit", type: "integer", desc: "Max rows (default 20, max 200)." },
    ],
    example: `curl -s "${READ_API_BASE}/rest/v1/contract_calls?network=eq.mainnet&contract_hash=eq.0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5&limit=5"`,
  },
  {
    category: "rest",
    method: "GET",
    path: "/rest/v1/nep17_transfers",
    desc: "REST-compat NEP-17 transfer table (requires network=eq.<net>).",
    pathParams: [],
    queryParams: [
      { name: "network", type: "string", desc: "eq.mainnet | eq.testnet (required)." },
      { name: "limit", type: "integer", desc: "Max rows (default 20, max 200)." },
    ],
    example: `curl -s "${READ_API_BASE}/rest/v1/nep17_transfers?network=eq.mainnet&limit=5"`,
  },
  {
    category: "rest",
    method: "GET",
    path: "/rest/v1/transaction_signers",
    desc: "REST-compat transaction signers table (requires network=eq.<net>).",
    pathParams: [],
    queryParams: [
      { name: "network", type: "string", desc: "eq.mainnet | eq.testnet (required)." },
      { name: "limit", type: "integer", desc: "Max rows (default 20, max 200)." },
    ],
    example: `curl -s "${READ_API_BASE}/rest/v1/transaction_signers?network=eq.mainnet&limit=5"`,
  },

  // Realtime
  {
    category: "realtime",
    method: "GET (SSE)",
    path: "/v1/networks/{network}/sse/head",
    desc: "Server-Sent Events stream of new block headers. One event per confirmed block.",
    pathParams: [{ name: "network", desc: "mainnet | testnet" }],
    queryParams: [],
    example: `curl -sN "${READ_API_BASE}/v1/networks/mainnet/sse/head"`,
  },
  {
    category: "realtime",
    method: "GET (SSE)",
    path: "/v1/networks/{network}/sse/transactions",
    desc: "Server-Sent Events stream of new transactions. One batched event per confirmed block carrying that block's transactions.",
    pathParams: [{ name: "network", desc: "mainnet | testnet" }],
    queryParams: [],
    example: `curl -sN "${READ_API_BASE}/v1/networks/mainnet/sse/transactions"`,
  },
];
