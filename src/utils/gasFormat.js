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
