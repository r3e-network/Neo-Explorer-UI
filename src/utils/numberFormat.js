/**
 * General number formatting utilities for Neo N3 explorer.
 */

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
  const num = Number(value);
  return Number.isFinite(num) ? num.toLocaleString() : "0";
}

/**
 * Format a large number with K/M/B suffix.
 * @param {number|string} num
 * @returns {string}
 */
export function formatLargeNumber(num) {
  const n = Number(num);
  if (!Number.isFinite(n)) return "0";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toFixed(0);
}

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
 * Format a token's total supply adjusted by its decimals.
 * @param {number|string|null} totalSupply
 * @param {number} decimals
 * @returns {string}
 */
export function formatSupply(totalSupply, decimals = 0) {
  if (!totalSupply) return "0";
  return (totalSupply / Math.pow(10, decimals)).toLocaleString();
}

/**
 * Format a market cap value with $K/M/B suffix.
 * @param {number|string|null} value - Raw market cap value.
 * @returns {string}
 */
export function formatMarketCap(value) {
  if (!value) return "-";
  const cap = parseFloat(value);
  if (!Number.isFinite(cap) || cap <= 0) return "-";
  if (cap >= 1e9) return "$" + (cap / 1e9).toFixed(2) + "B";
  if (cap >= 1e6) return "$" + (cap / 1e6).toFixed(2) + "M";
  if (cap >= 1e3) return "$" + (cap / 1e3).toFixed(2) + "K";
  return "$" + cap.toFixed(2);
}
