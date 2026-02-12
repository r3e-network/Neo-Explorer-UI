/**
 * Shared formatters for Neo N3 explorer views.
 *
 * GAS has 8 decimals. NEO has 0 decimals (indivisible).
 * Neo N3 addresses start with 'N'. Transaction/block hashes start with '0x'.
 */
import { GAS_DIVISOR, NATIVE_CONTRACTS } from "@/constants";

/**
 * Truncate a hash or address for compact display.
 * @param {string} value - Full hash or address
 * @param {number} start - Characters to keep from the start
 * @param {number} end - Characters to keep from the end
 * @returns {string}
 */
export function truncateHash(value, start = 8, end = 6) {
  if (!value) return "";
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

/**
 * Format a unix timestamp to a locale string.
 * Handles both second and millisecond timestamps from neo3fura.
 * @param {number} timestamp
 * @returns {string}
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return "";
  const ms = timestamp > 1e12 ? timestamp : timestamp * 1000;
  return new Date(ms).toLocaleString();
}

// Aliases for backward compatibility
export const formatUnixTime = formatDateTime;
export const formatTime = formatDateTime;

/**
 * Format a timestamp as a human-readable relative age string.
 * @param {number} timestamp - Unix timestamp (seconds or milliseconds)
 * @param {number} nowMs - Current time in milliseconds (for testability)
 * @returns {string}
 */
export function formatAge(timestamp, nowMs = Date.now()) {
  if (!timestamp) return "";

  const ts = timestamp > 1e12 ? Math.floor(timestamp / 1000) : timestamp;
  const seconds = Math.max(0, Math.floor(nowMs / 1000 - ts));

  if (seconds < 60) return `${seconds} secs ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hrs ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

/**
 * Format byte values to human-readable size.
 * @param {number|string} value
 * @returns {string}
 */
export function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Format a number with locale-aware thousand separators.
 * @param {number|string|null} value
 * @returns {string}
 */
export function formatNumber(value) {
  if (value === null || value === undefined) return "0";
  return Number(value).toLocaleString();
}

/**
 * Format a raw GAS value (integer units) to a decimal string.
 * GAS has 8 decimal places by default.
 * @param {number|string} value - Raw integer GAS value
 * @param {number} decimals - Decimal places to display
 * @returns {string}
 */
export function formatGas(value, decimals = 8) {
  if (!value) return "0";
  return (Number(value) / GAS_DIVISOR).toFixed(decimals);
}

/**
 * Return raw transaction fee in fixed8 units (netfee + sysfee).
 * @param {{netfee?: number|string, sysfee?: number|string}|null|undefined} tx
 * @returns {number}
 */
export function getTransactionTotalFee(tx) {
  const net = Number(tx?.netfee ?? 0);
  const sys = Number(tx?.sysfee ?? 0);

  const safeNet = Number.isFinite(net) ? net : 0;
  const safeSys = Number.isFinite(sys) ? sys : 0;

  return safeNet + safeSys;
}

/**
 * Format a decimal GAS string (e.g. gasconsumed from RPC) for display.
 * Unlike formatGas, this does NOT divide by GAS_DIVISOR because the value
 * is already in GAS units (e.g. "9.977").
 * @param {number|string} value - Decimal GAS value
 * @param {number} decimals - Decimal places to display
 * @returns {string}
 */
export function formatGasDecimal(value, decimals = 4) {
  if (!value) return "0";
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return num.toFixed(decimals);
}

/**
 * Format a raw NEO value. NEO is indivisible (0 decimals).
 * @param {number|string} value
 * @returns {string}
 */
export function formatNeo(value) {
  if (!value) return "0";
  return Math.floor(Number(value)).toLocaleString();
}

/**
 * Validate a Neo N3 address (starts with 'N', base58 encoded, 34 chars).
 * @param {string} addr
 * @returns {boolean}
 */
export function isValidNeoAddress(addr) {
  if (!addr || typeof addr !== "string") return false;
  return /^N[A-HJ-NP-Za-km-z1-9]{33}$/.test(addr);
}

/**
 * Validate a Neo N3 transaction hash (0x prefix + 64 hex chars).
 * @param {string} hash
 * @returns {boolean}
 */
export function isValidTxHash(hash) {
  if (!hash || typeof hash !== "string") return false;
  return /^0x[0-9a-fA-F]{64}$/.test(hash);
}

/**
 * Validate a Neo N3 block hash (same format as tx hash).
 * @param {string} hash
 * @returns {boolean}
 */
export function isValidBlockHash(hash) {
  return isValidTxHash(hash);
}

// ---------------------------------------------------------------------------
// Price formatting (shared by AppHeader + HomePageNew)
// ---------------------------------------------------------------------------

/**
 * Format a price value to 2 decimal places.
 * @param {number|string} value
 * @returns {string}
 */
export function formatPrice(value) {
  return Number(value || 0).toFixed(2);
}

/**
 * Format a price change percentage with sign prefix.
 * @param {number|string} change
 * @returns {string}
 */
export function formatPriceChange(change) {
  const value = Number(change || 0);
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Return a Tailwind text-color class based on price change direction.
 * @param {number|string} change
 * @returns {string}
 */
export function priceChangeClass(change) {
  return Number(change || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
}

/**
 * Format a large number with K/M/B suffix.
 * @param {number|string} num
 * @returns {string}
 */
export function formatLargeNumber(num) {
  if (!num) return "0";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return Number(num).toFixed(0);
}

// ---------------------------------------------------------------------------
// VM state styling (shared by ExecutionTraceView, ContractCallMap, EventsTable)
// ---------------------------------------------------------------------------

/**
 * Return Tailwind classes for a VM state badge.
 * @param {string} state - "HALT", "FAULT", or other
 * @returns {string}
 */
export function vmStateClass(state) {
  if (state === "HALT")
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
  if (state === "FAULT")
    return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
  return "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600";
}

/**
 * Return Tailwind class for a VM state dot indicator.
 * @param {string} state
 * @returns {string}
 */
export function vmStateDot(state) {
  if (state === "HALT") return "bg-emerald-500";
  if (state === "FAULT") return "bg-red-500";
  return "bg-gray-400";
}

// ---------------------------------------------------------------------------
// Search type icon/badge mapping (shared by SearchBox)
// ---------------------------------------------------------------------------

/**
 * Return a short label for a search result type.
 * @param {string} type
 * @returns {string}
 */
export function getTypeIcon(type) {
  return { block: "Bk", transaction: "Tx", address: "Ad", contract: "Ct", token: "Tk" }[type] || "?";
}

/**
 * Return Tailwind classes for a search type icon container.
 * @param {string} type
 * @returns {string}
 */
export function getTypeIconClass(type) {
  return (
    {
      block: "bg-primary-100 dark:bg-primary-900/30 text-primary-600",
      transaction: "bg-green-100 dark:bg-green-900/30 text-green-600",
      address: "bg-orange-100 dark:bg-orange-900/30 text-orange-600",
      contract: "bg-purple-100 dark:bg-purple-900/30 text-purple-600",
      token: "bg-blue-100 dark:bg-blue-900/30 text-blue-600",
    }[type] || "bg-primary-100 dark:bg-primary-900/30 text-primary-600"
  );
}

/**
 * Return Tailwind classes for a search type badge.
 * @param {string} type
 * @returns {string}
 */
export function getTypeBadgeClass(type) {
  return (
    {
      block: "bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400",
      transaction: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
      address: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
      contract: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
      token: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    }[type] || "bg-gray-100 text-gray-600"
  );
}

// ---------------------------------------------------------------------------
// Balance & supply formatting (shared by Accounts, AddressDetail, Tokens)
// ---------------------------------------------------------------------------

/**
 * Format a raw balance for display with locale-aware thousand separators.
 * @param {number|string|null} balance
 * @param {number} maximumFractionDigits
 * @returns {string}
 */
export function formatBalance(balance, maximumFractionDigits = 0) {
  if (!balance) return "0";
  const num = parseFloat(balance);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString(undefined, { maximumFractionDigits });
}

/**
 * Format a raw GAS balance by dividing by a divisor (default GAS_DIVISOR).
 * @param {number|string|null} balance
 * @param {number} divisor
 * @returns {string}
 */
export function formatGasBalance(balance, divisor = GAS_DIVISOR) {
  if (!balance) return "0";
  const num = parseFloat(balance) / divisor;
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

/**
 * Format a token's total supply adjusted by its decimals.
 * @param {number|string|null} totalSupply
 * @param {number} decimals
 * @returns {string}
 */
export function formatSupply(totalSupply, decimals = 0) {
  if (!totalSupply) return "0";
  return (totalSupply / Math.pow(10, decimals)).toLocaleString();
}

// ---------------------------------------------------------------------------
// Token amount & contract name formatting (shared by trace components)
// ---------------------------------------------------------------------------

/**
 * Format a raw token amount with decimal adjustment.
 * @param {number|string} rawAmount - Raw integer amount
 * @param {number} decimals - Token decimals (e.g. 8 for GAS)
 * @param {number} displayDecimals - Max decimal places to show
 * @returns {string}
 */
export function formatTokenAmount(rawAmount, decimals = 0, displayDecimals = 8) {
  if (!rawAmount && rawAmount !== 0) return "0";
  const num = Number(rawAmount);
  if (!Number.isFinite(num)) return "0";
  if (decimals === 0) return num.toLocaleString();
  const adjusted = num / Math.pow(10, decimals);
  return adjusted.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.min(decimals, displayDecimals),
  });
}

/**
 * Get a human-readable display name for a contract.
 * Checks NATIVE_CONTRACTS first, falls back to manifestName or truncated hash.
 * @param {string} hash - Contract hash (0x-prefixed)
 * @param {string|null} manifestName - Name from contract manifest
 * @returns {string}
 */
export function getContractDisplayName(hash, manifestName = null) {
  const native = NATIVE_CONTRACTS[hash?.toLowerCase()];
  if (native) return native.name;
  if (manifestName) return manifestName;
  return truncateHash(hash);
}
