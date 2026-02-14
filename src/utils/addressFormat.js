/**
 * Address and hash formatting/validation utilities for Neo N3 explorer.
 *
 * Neo N3 addresses start with 'N'. Transaction/block hashes start with '0x'.
 */

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
