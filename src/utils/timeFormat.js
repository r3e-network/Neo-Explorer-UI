/**
 * Time and date formatting utilities for Neo N3 explorer.
 */

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
