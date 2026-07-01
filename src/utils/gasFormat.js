/**
 * GAS and NEO token formatting utilities for Neo N3 explorer.
 *
 * GAS has 8 decimals. NEO has 0 decimals (indivisible).
 */
import { GAS_DIVISOR } from "@/constants";

/**
 * Format a raw GAS value (integer units) to a decimal string.
 * GAS has 8 decimal places by default.
 * @param {number|string} value - Raw integer GAS value
 * @param {number} decimals - Decimal places to display
 * @returns {string}
 */
export function formatGas(value, decimals = 8) {
  if (!value) return "0";
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  // Values that fit safely in a JS Number keep the existing fixed-decimal
  // formatting. Larger raw integers (above 2^53) lose precision via Number(),
  // so route them through the BigInt-safe path used by formatTokenAmount.
  if (Math.abs(num) <= Number.MAX_SAFE_INTEGER) {
    return (num / GAS_DIVISOR).toFixed(decimals);
  }
  return formatTokenAmount(value, 8, decimals);
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

/**
 * Format a raw NEO value. NEO is indivisible (0 decimals).
 * @param {number|string} value
 * @returns {string}
 */
export function formatNeo(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return Math.floor(num).toLocaleString();
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
 * Convert a raw integer token amount to token units for arithmetic such as
 * USD valuation. Display formatting should still use formatTokenAmount.
 * @param {number|string|null|undefined} rawAmount
 * @param {number|string} decimals
 * @returns {number}
 */
export function toTokenAmountNumber(rawAmount, decimals = 0) {
  if (rawAmount === null || rawAmount === undefined || rawAmount === "") return 0;
  const raw = Number(rawAmount);
  const decimalsNum = Number(decimals) || 0;
  if (!Number.isFinite(raw) || decimalsNum < 0) return 0;
  const divisor = decimalsNum > 0 ? 10 ** decimalsNum : 1;
  return raw / divisor;
}

/**
 * Format a raw token amount with decimal adjustment.
 * @param {number|string} rawAmount - Raw integer amount
 * @param {number} decimals - Token decimals (e.g. 8 for GAS)
 * @param {number} displayDecimals - Max decimal places to show
 * @returns {string}
 */
export function formatTokenAmount(rawAmount, decimals = 0, displayDecimals = 8) {
  if (rawAmount === null || rawAmount === undefined || rawAmount === "") return "0";

  const decimalsNum = Number(decimals) || 0;
  const displayMax = Math.min(decimalsNum, Math.max(0, Number(displayDecimals) || 0));

  // For values that fit safely in a JS Number, the fast path keeps the
  // existing locale-aware formatting cheap. This covers the vast majority
  // of explorer-displayed amounts.
  const num = Number(rawAmount);
  const fitsInNumber =
    Number.isFinite(num) && Math.abs(num) <= Number.MAX_SAFE_INTEGER;
  if (fitsInNumber) {
    if (decimalsNum === 0) return num.toLocaleString();
    const adjusted = num / Math.pow(10, decimalsNum);
    return adjusted.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: displayMax,
    });
  }

  // Slow path: large integer amounts (whale-sized, or 18-decimal tokens)
  // lose precision via Number(). Format via BigInt-safe string math so the
  // displayed integer part stays exact and the fractional part is rounded
  // to `displayMax` digits.
  let raw;
  try {
    raw = BigInt(String(rawAmount).split(".")[0]);
  } catch {
    return "0";
  }
  const negative = raw < 0n;
  const abs = negative ? -raw : raw;

  if (decimalsNum === 0) {
    const grouped = Number(abs <= BigInt(Number.MAX_SAFE_INTEGER) ? abs : 0).toLocaleString();
    if (abs <= BigInt(Number.MAX_SAFE_INTEGER)) return negative ? `-${grouped}` : grouped;
    // Manually group large bigints from the right.
    const digits = abs.toString();
    const groups = [];
    for (let i = digits.length; i > 0; i -= 3) {
      groups.unshift(digits.slice(Math.max(0, i - 3), i));
    }
    return (negative ? "-" : "") + groups.join(",");
  }

  const divisor = 10n ** BigInt(decimalsNum);
  const intPart = abs / divisor;
  const fracPart = abs % divisor;
  const fracStr = fracPart.toString().padStart(decimalsNum, "0").slice(0, displayMax).replace(/0+$/, "");

  // Group the integer part with thousands separators using the same
  // locale formatter — at the integer scale we expect, it's safe to take
  // the digit string and re-group manually if it overflows.
  const intDigits = intPart.toString();
  let intGrouped;
  if (intPart <= BigInt(Number.MAX_SAFE_INTEGER)) {
    intGrouped = Number(intPart).toLocaleString();
  } else {
    const groups = [];
    for (let i = intDigits.length; i > 0; i -= 3) {
      groups.unshift(intDigits.slice(Math.max(0, i - 3), i));
    }
    intGrouped = groups.join(",");
  }

  const sign = negative ? "-" : "";
  return fracStr ? `${sign}${intGrouped}.${fracStr}` : `${sign}${intGrouped}`;
}
