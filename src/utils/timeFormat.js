import { getCurrentEnv, NET_ENV } from "./env";

const DISPLAY_DELAY_OFFSET_SECONDS = {
  [NET_ENV.Mainnet]: 0,
  [NET_ENV.TestT5]: 0,
};

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
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || ts === 0) return "";
  const ms = ts > 1e12 ? ts : ts * 1000;
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
  const raw = Number(timestamp);
  if (!Number.isFinite(raw) || raw === 0) return "";

  const ts = raw > 1e12 ? Math.floor(raw / 1000) : raw;
  const network = getCurrentEnv();
  const delayOffset = DISPLAY_DELAY_OFFSET_SECONDS[network] ?? 0;
  const seconds = Math.max(0, Math.floor(nowMs / 1000 - ts) - delayOffset);

  if (seconds === 0) return "just now";
  if (seconds < 60) return `${seconds} secs ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hrs ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
