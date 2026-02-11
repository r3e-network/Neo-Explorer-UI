// Native token contract hashes (always lowercase for consistent comparison)
export const NEO_HASH = "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5";
export const GAS_HASH = "0xd2a4cff31913016155e38e474a2c06d08be276cf";
export const CONTRACT_MANAGEMENT_HASH = "0x49cf4e5378ffcd4dec034fd98a174c5491e395e2";

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// GAS precision (1 GAS = 10^8 fractions)
export const GAS_DECIMALS = 8;
export const GAS_DIVISOR = 1e8;

// Network fee burn rate
export const BURN_RATE = 0.00003;

// Timer & delay constants (milliseconds)

/** Homepage auto-refresh interval for latest blocks/transactions */
export const HOME_REFRESH_INTERVAL = 15000;

/** Gas tracker page auto-refresh interval */
export const GAS_TRACKER_REFRESH_INTERVAL = 30000;

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
  "0xfe924b7cfe89ddd271abaf7210a80a7e11178758": { name: "RoleManagement", symbol: null, decimals: null },
  "0xda65b600f7124ce6c79950c1772a36403104f2be": { name: "OracleContract", symbol: null, decimals: null },
  "0xacce6fd80d44e1796aa0c2c625e9e4e0ce39efc0": { name: "StdLib", symbol: null, decimals: null },
  "0xfffdc93764dbaddd97c48f252a53ea4643faa3fd": { name: "CryptoLib", symbol: null, decimals: null },
  "0x726cb6e0cd8628a1350a611384688911ab75f51b": { name: "LedgerContract", symbol: null, decimals: null },
  "0xcc5e4edd9f5f8dba8bb65734541df7a1c081c67b": { name: "PolicyContract", symbol: null, decimals: null },
};

export const OPERATION_TYPES = {
  transfer: { label: "Transfer", color: "emerald" },
  deploy: { label: "Deploy", color: "blue" },
  vote: { label: "Vote", color: "purple" },
  destroy: { label: "Destroy", color: "red" },
  approval: { label: "Approval", color: "amber" },
  mint: { label: "Mint", color: "teal" },
  burn: { label: "Burn", color: "orange" },
  custom: { label: "Contract Call", color: "gray" },
};

export const MAX_INLINE_OPERATIONS = 20;
