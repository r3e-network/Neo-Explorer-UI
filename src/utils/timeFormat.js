import { getCurrentEnv, NET_ENV } from "./env";

// Resolve via the global i18n instance so callers don't need to pass `t`.
// Defaults to English when the key has not been loaded yet (initial render
// before async locale messages arrive, or test runs without i18n) — vue-i18n
// returns the literal key string in that case, so we detect & fall back.
function tAge(key, params, fallback) {
  try {
    // Lazy-import to avoid a module-init cycle (timeFormat is imported by
    // many leaves; vue-i18n depends on Vue runtime which isn't always
    // available in pure-utility contexts).
    const i18n = globalThis.__neoExplorerI18n__;
    if (!i18n) return fallback;
    const out = i18n.global.t(key, params);
    return out === key ? fallback : out;
  } catch {
    return fallback;
  }
}

/**
 * Map an internal locale code (cn/en/fr/ja/ko) to the corresponding BCP 47
 * tag accepted by Intl.DateTimeFormat / toLocaleDateString. Pass through
 * already-valid tags untouched and fall back to "en" for anything unknown.
 * @param {string|null|undefined} locale
 * @returns {string}
 */
export function toBcp47(locale) {
  const raw = String(locale || "").trim().toLowerCase();
  if (raw === "cn" || raw === "zh" || raw === "zh_cn" || raw === "zh-cn") return "zh-CN";
  if (raw === "en" || raw === "fr" || raw === "ja" || raw === "ko") return raw;
  return "en";
}

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

  if (seconds === 0) return tAge("time.justNow", {}, "just now");
  if (seconds < 60) return tAge("time.secsAgo", { n: seconds }, `${seconds} secs ago`);
  const mins = Math.floor(seconds / 60);
  if (seconds < 3600) return tAge("time.minsAgo", { n: mins }, `${mins} mins ago`);
  const hrs = Math.floor(seconds / 3600);
  if (seconds < 86400) return tAge("time.hrsAgo", { n: hrs }, `${hrs} hrs ago`);
  const days = Math.floor(seconds / 86400);
  return tAge("time.daysAgo", { n: days }, `${days} days ago`);
}
