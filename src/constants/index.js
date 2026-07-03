// Native token contract hashes (always lowercase for consistent comparison)
export const NEO_HASH = "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5";
export const GAS_HASH = "0xd2a4cff31913016155e38e474a2c06d08be276cf";
export const CONTRACT_MANAGEMENT_HASH = "0xfffdc93764dbaddd97c48f252a53ea4643faa3fd";
export const NNS_HASH = "0x50ac1c37690cc2cfc594472833cf57505d5f46de";
export const POLICY_HASH = "0xcc5e4edd9f5f8dba8bb65734541df7a1c081c67b";
export const ORACLE_HASH = "0xfe924b7cfe89ddd271abaf7210a80a7e11178758";

// ---------------------------------------------------------------------------
// Null / zero sentinel values
// ---------------------------------------------------------------------------

/** 256-bit zero hash — used to identify system transactions (e.g. oracle rewards) */
export const NULL_TX_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";

/** 160-bit zero address — represents the null/burn address */
export const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// The transactions read-api clamps the server-side offset at this value
// (maxTransactionListOffset in supabase_indexer/internal/readapi/server.go).
// Beyond it every page repeats the clamped rows, so the list pager caps its
// reachable pages here and steers users to search for older transactions.
export const MAX_TRANSACTION_LIST_OFFSET = 2000;

// GAS precision (1 GAS = 10^8 fractions)
export const GAS_DECIMALS = 8;
export const GAS_DIVISOR = 1e8;

// Well-known token contract hashes (for quick-select datalists in tools)
export const FLM_HASH = "0xf0151f528127558851b39c2cd8aa47da7418ab28";
export const BNEO_HASH = "0x48c40d4666f93408be1bef038b6722404d9a4c2a";

// Matrix domain contract fallback hashes (overridable via env)
export const MATRIX_HASH_TESTNET = "0x89908093c5ccc463e2c5744d6bacb06108b60a75";
export const MATRIX_HASH_MAINNET = "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd";

// Network fee burn rate
export const BURN_RATE = 0.00003;

// Timer & delay constants (milliseconds)

/** Debounce delay for search input fields */
export const SEARCH_DEBOUNCE_MS = 350;

/** Duration to show copy success/failure feedback */
export const COPY_FEEDBACK_TIMEOUT_MS = 2000;

/** Delay before closing navigation dropdown on mouse leave */
export const DROPDOWN_CLOSE_DELAY_MS = 120;

// ---------------------------------------------------------------------------
// Native contract metadata (Neo N3 mainnet)
// ---------------------------------------------------------------------------

export const NATIVE_CONTRACTS = {
  [NEO_HASH]: { name: "NeoToken", symbol: "NEO", decimals: 0 },
  [GAS_HASH]: { name: "GasToken", symbol: "GAS", decimals: 8 },
  [CONTRACT_MANAGEMENT_HASH]: { name: "ContractManagement", symbol: null, decimals: null },
  "0xacce6fd80d44e1796aa0c2c625e9e4e0ce39efc0": { name: "StdLib", symbol: null, decimals: null },
  "0x726cb6e0cd8628a1350a611384688911ab75f51b": { name: "CryptoLib", symbol: null, decimals: null },
  "0xda65b600f7124ce6c79950c1772a36403104f2be": { name: "LedgerContract", symbol: null, decimals: null },
  [POLICY_HASH]: { name: "PolicyContract", symbol: null, decimals: null },
  "0x49cf4e5378ffcd4dec034fd98a174c5491e395e2": { name: "RoleManagement", symbol: null, decimals: null },
  [ORACLE_HASH]: { name: "OracleContract", symbol: null, decimals: null },
  "0xc1e14f19c3e60d0b9244d06dd7ba9b113135ec3b": { name: "Notary", symbol: null, decimals: null },
  "0x156326f25b1b5d839a4d326aeaa75383c9563ac1": { name: "Treasury", symbol: null, decimals: null },
};

export const OPERATION_TYPES = {
  transfer: { labelKey: "operationTypes.transfer", color: "emerald" },
  deploy: { labelKey: "operationTypes.deploy", color: "blue" },
  vote: { labelKey: "operationTypes.vote", color: "purple" },
  destroy: { labelKey: "operationTypes.destroy", color: "red" },
  approval: { labelKey: "operationTypes.approval", color: "amber" },
  mint: { labelKey: "operationTypes.mint", color: "teal" },
  burn: { labelKey: "operationTypes.burn", color: "orange" },
  custom: { labelKey: "operationTypes.custom", color: "gray" },
};

export const MAX_INLINE_OPERATIONS = 20;

// Contract verification result codes returned by the verification server
export const VERIFICATION_RESULT = {
  SERVER_ERROR_0: 0,
  SERVER_ERROR_1: 1,
  COMPILATION_FAILURE: 2,
  SERVER_ERROR_3: 3,
  CONTRACT_NOT_FOUND: 4,
  SUCCESS: 5,
  ALREADY_VERIFIED: 6,
  MISMATCH: 7,
};
