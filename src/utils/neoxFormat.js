// EVM value / hash / time formatting for Neo X views.
//
// Kept separate from the N3 formatters: Neo X GAS is the native EVM currency
// with 18 decimals (wei), whereas N3 GAS has 8 decimals and NEO is indivisible.
// Mixing the two format paths is exactly the "value formatting" hazard flagged
// in the design, so /x views format through here.

const DEFAULT_DECIMALS = 18;

/**
 * Format a base-unit integer (string/number/bigint) into a decimal string.
 * @param {string|number|bigint} value
 * @param {number} [decimals=18]
 * @param {number} [maxFractionDigits=6]
 * @returns {string}
 */
export function formatUnits(value, decimals = DEFAULT_DECIMALS, maxFractionDigits = 6) {
  try {
    if (value === undefined || value === null || value === "") return "0";
    const raw = BigInt(String(value).split(".")[0]);
    const negative = raw < 0n;
    const abs = negative ? -raw : raw;
    const base = 10n ** BigInt(decimals);
    const whole = abs / base;
    const frac = abs % base;
    const fracStr = frac
      .toString()
      .padStart(decimals, "0")
      .slice(0, maxFractionDigits)
      .replace(/0+$/, "");
    const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${negative ? "-" : ""}${wholeStr}${fracStr ? `.${fracStr}` : ""}`;
  } catch (_err) {
    return "0";
  }
}

/** Native GAS (18 decimals) amount. */
export const formatGas = (wei, maxFractionDigits = 6) => formatUnits(wei, DEFAULT_DECIMALS, maxFractionDigits);

/** Gwei from wei, for gas prices. */
export const formatGwei = (wei, maxFractionDigits = 2) => formatUnits(wei, 9, maxFractionDigits);

/** Middle-truncate a hash/address, preserving a 0x prefix. */
export function shortHash(hash, head = 6, tail = 4) {
  const s = String(hash || "");
  const prefix = s.startsWith("0x") ? 2 : 0;
  if (s.length <= prefix + head + tail + 1) return s;
  return `${s.slice(0, prefix + head)}…${s.slice(-tail)}`;
}

/** Thousands-separated integer. */
export function formatInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-US");
}

/** Absolute timestamp (locale) from ms. */
export function formatTimestamp(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return new Date(n).toLocaleString();
}

/** Compact relative time ("12s ago", "3m ago", "5h ago", "2d ago"). */
export function timeAgo(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - n) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
