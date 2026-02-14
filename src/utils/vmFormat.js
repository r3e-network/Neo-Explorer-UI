/**
 * NeoVM state styling and search type badge utilities for Neo N3 explorer.
 */
import { NATIVE_CONTRACTS } from "@/constants";
import { truncateHash } from "./addressFormat";

/**
 * Return Tailwind classes for a VM state badge.
 * @param {string} state - "HALT", "FAULT", or other
 * @returns {string}
 */
export function vmStateClass(state) {
  if (state === "HALT")
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
  if (state === "FAULT")
    return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
  return "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600";
}

/**
 * Return Tailwind class for a VM state dot indicator.
 * @param {string} state
 * @returns {string}
 */
export function vmStateDot(state) {
  if (state === "HALT") return "bg-emerald-500";
  if (state === "FAULT") return "bg-red-500";
  return "bg-gray-400";
}

/**
 * Return a short label for a search result type.
 * @param {string} type
 * @returns {string}
 */
export function getTypeIcon(type) {
  return { block: "Bk", transaction: "Tx", address: "Ad", contract: "Ct", token: "Tk" }[type] || "?";
}

/**
 * Return Tailwind classes for a search type icon container.
 * @param {string} type
 * @returns {string}
 */
export function getTypeIconClass(type) {
  return (
    {
      block: "bg-primary-100 dark:bg-primary-900/30 text-primary-600",
      transaction: "bg-green-100 dark:bg-green-900/30 text-green-600",
      address: "bg-orange-100 dark:bg-orange-900/30 text-orange-600",
      contract: "bg-purple-100 dark:bg-purple-900/30 text-purple-600",
      token: "bg-blue-100 dark:bg-blue-900/30 text-blue-600",
    }[type] || "bg-primary-100 dark:bg-primary-900/30 text-primary-600"
  );
}

/**
 * Return Tailwind classes for a search type badge.
 * @param {string} type
 * @returns {string}
 */
export function getTypeBadgeClass(type) {
  return (
    {
      block: "bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400",
      transaction: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
      address: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
      contract: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
      token: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    }[type] || "bg-gray-100 text-gray-600"
  );
}

/**
 * Tailwind CSS class for NeoVM opcode badge coloring.
 * Groups opcodes by category: stack, call, jump/control, load/store.
 * @param {string} opcode - The opcode name (e.g. "PUSH1", "SYSCALL")
 * @returns {string} Tailwind class string
 */
export function opcodeColorClass(opcode) {
  if (!opcode) return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  const op = opcode.toUpperCase();
  if (op.startsWith("PUSH") || op === "POP" || op === "NOP")
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (op === "SYSCALL" || op === "CALL" || op === "CALLT" || op === "CALLA")
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  if (op.startsWith("JMP") || op === "RET" || op === "ABORT" || op === "THROW")
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  if (op.startsWith("LD") || op.startsWith("ST"))
    return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
  return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
}

/**
 * Get a human-readable display name for a contract.
 * Checks NATIVE_CONTRACTS first, falls back to manifestName or truncated hash.
 * @param {string} hash - Contract hash (0x-prefixed)
 * @param {string|null} manifestName - Name from contract manifest
 * @returns {string}
 */
export function getContractDisplayName(hash, manifestName = null) {
  const native = NATIVE_CONTRACTS[hash?.toLowerCase()];
  if (native) return native.name;
  if (manifestName) return manifestName;
  return truncateHash(hash);
}
