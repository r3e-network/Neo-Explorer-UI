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
 * Derive a transfer type's i18n key.
 *
 * @param {object} item          - Transfer record with txid, from, to, value.
 * @param {"nep17"|"nep11"} type - Token standard.
 * @param {string} [contractHash] - Contract hash (needed for GAS-specific labels).
 * @returns {string} An i18n key under the `transferTypes.*` namespace.
 */
export function getTypeLabelKey(item, type, contractHash) {
  if (type === "nep17") {
    if (isNullTx(item.txid) && item.from === null && item.value === "50000000") return "transferTypes.blockReward";
    if (isOracleReward(item)) return "transferTypes.oracleFeeReward";
    if (isNullTx(item.txid) && item.from === null) return "transferTypes.networkFeeReward";
    if (isNullTx(item.txid) && item.to === null) return "transferTypes.feeBurn";
    if (item.from === null && contractHash === GAS_HASH) return "transferTypes.transferReward";
  }
  if (item.from === null) return "transferTypes.mint";
  if (item.to === null) return "transferTypes.burn";
  return "transferTypes.transfer";
}

const BADGE_MAP = {
  "transferTypes.blockReward": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "transferTypes.oracleFeeReward": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "transferTypes.networkFeeReward": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "transferTypes.feeBurn": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "transferTypes.transferReward": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "transferTypes.mint": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "transferTypes.burn": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "transferTypes.transfer": "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400",
};

/**
 * Return Tailwind badge classes for a transfer type.
 *
 * @param {object} item
 * @param {"nep17"|"nep11"} type
 * @param {string} [contractHash]
 * @returns {string}
 */
export function getTypeBadge(item, type, contractHash) {
  return BADGE_MAP[getTypeLabelKey(item, type, contractHash)] || "";
}
