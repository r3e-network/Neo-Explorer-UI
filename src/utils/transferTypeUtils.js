import isOracleReward from "@/utils/isOracleReward";
import { GAS_HASH, NULL_TX_HASH } from "@/constants";

/**
 * Check if a transaction hash is the null/system hash.
 * @param {string} hash
 * @returns {boolean}
 */
export function isNullTx(hash) {
  return hash === NULL_TX_HASH;
}

/**
 * Derive a human-readable transfer type label.
 *
 * @param {object} item          - Transfer record with txid, from, to, value.
 * @param {"nep17"|"nep11"} type - Token standard.
 * @param {string} [contractHash] - Contract hash (needed for GAS-specific labels).
 * @returns {string}
 */
export function getTypeLabel(item, type, contractHash) {
  if (type === "nep17") {
    if (isNullTx(item.txid) && item.from === null && item.value === "50000000") return "Block Reward";
    if (isOracleReward(item)) return "Oracle Fee Reward";
    if (isNullTx(item.txid) && item.from === null) return "Network Fee Reward";
    if (isNullTx(item.txid) && item.to === null) return "Fee Burn";
    if (item.from === null && contractHash === GAS_HASH) return "Transfer Reward";
  }
  if (item.from === null) return "Mint";
  if (item.to === null) return "Burn";
  return "Transfer";
}

const BADGE_MAP = {
  "Block Reward": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Oracle Fee Reward": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "Network Fee Reward": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "Fee Burn": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "Transfer Reward": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Mint: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Burn: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Transfer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

/**
 * Return Tailwind badge classes for a transfer type label.
 *
 * @param {object} item
 * @param {"nep17"|"nep11"} type
 * @param {string} [contractHash]
 * @returns {string}
 */
export function getTypeBadge(item, type, contractHash) {
  return BADGE_MAP[getTypeLabel(item, type, contractHash)] || "";
}
