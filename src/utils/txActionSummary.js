// One-line human summary of an adapted Neo X transaction.
//
// Pure precedence chain consumed by XTxDetail's info banner: contract
// deployment > token transfers > native GAS send > bare contract call.
// This module only extracts the facts (kind + display parts); the view
// composes the localized sentence and renders links/chips around them.

import { formatUnits, formatGas, shortHash } from "@/utils/neoxFormat";

const MAX_TRANSFER_ITEMS = 2;
// ERC-1155 transfers carry decimals: null — whole units (0), not wei (18).
const DEFAULT_TOKEN_DECIMALS = 0;

// Blockscout transfer type → chip direction (null for plain transfers).
function transferDirection(type) {
  if (type === "token_minting") return "mint";
  if (type === "token_burning") return "burn";
  return null;
}

// Wei string/number/bigint → bigint; anything unparseable counts as zero.
function toBigInt(value) {
  try {
    if (value === undefined || value === null || value === "") return 0n;
    return BigInt(String(value).split(".")[0]);
  } catch (_err) {
    return 0n;
  }
}

function transferItem(transfer) {
  const total = transfer?.total || {};
  const rawDecimals = Number(total.decimals ?? transfer?.token?.decimals ?? DEFAULT_TOKEN_DECIMALS);
  const decimals = Number.isFinite(rawDecimals) ? rawDecimals : DEFAULT_TOKEN_DECIMALS;
  return {
    amount: total.value != null ? formatUnits(total.value, decimals) : null,
    symbol: transfer?.token?.symbol || "",
    tokenId: total.token_id != null ? String(total.token_id) : null,
    direction: transferDirection(transfer?.type),
  };
}

/**
 * Build a one-line action summary for an adapted XTransaction.
 *
 * First match wins:
 *   1. contract deployment → { kind: "deploy", contract }
 *   2. token transfers     → { kind: "transfers", count, items } (first 2 items)
 *   3. native value > 0    → { kind: "send", amount, to }
 *   4. named method call   → { kind: "call", method, target }
 *
 * @param {Object} tx - Adapted XTransaction (transactionService.getByHash shape).
 * @returns {{ kind: string }|null} Summary parts, or null when nothing notable.
 */
export function buildTxActionSummary(tx) {
  if (!tx || typeof tx !== "object") return null;

  if (tx.createdContract?.hash) {
    return { kind: "deploy", contract: tx.createdContract.name || tx.createdContract.hash };
  }

  const transfers = Array.isArray(tx.tokenTransfers) ? tx.tokenTransfers : [];
  if (transfers.length > 0) {
    return {
      kind: "transfers",
      count: transfers.length,
      items: transfers.slice(0, MAX_TRANSFER_ITEMS).map(transferItem),
    };
  }

  if (toBigInt(tx.value) > 0n) {
    return { kind: "send", amount: formatGas(tx.value), to: tx.toInfo?.name || shortHash(tx.to) };
  }

  if (tx.method) {
    return { kind: "call", method: tx.method, target: tx.toInfo?.name || shortHash(tx.to) };
  }

  return null;
}

export default buildTxActionSummary;
