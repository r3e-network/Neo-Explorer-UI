/**
 * Centralized search -> route mapping.
 *
 * The UI has multiple search boxes (header, homepage hero). Historically they
 * duplicated routing logic. Keeping it here makes layout refactors safe.
 */
import { isValidNeoAddress, isValidTxHash } from "@/utils/explorerFormat";

/**
 * Detect the type of a search query based on its format.
 * @param {string} query - Raw user input
 * @returns {'address'|'tx'|'block'|'contract'|'token'|'unknown'}
 */
export function detectSearchType(query) {
  const q = (query || "").trim();
  if (!q) return "unknown";

  // Pure numeric -> block height
  if (/^\d+$/.test(q)) return "block";

  // N-prefix base58 address (34 chars)
  if (isValidNeoAddress(q)) return "address";

  // 0x-prefix 64-char hex -> tx or block hash (default to tx)
  if (isValidTxHash(q)) return "tx";

  // Partial hex without 0x prefix (40-64 chars) -> likely contract hash
  if (/^[0-9a-fA-F]{40,64}$/.test(q)) return "contract";

  return "unknown";
}

/**
 * Resolve a search query + API result into a Vue Router location object.
 * @param {string} query
 * @param {{ type?: string, data?: any } | null} result
 * @returns {{ path: string, query?: Record<string, string> } | null}
 */
export function resolveSearchLocation(query, result) {
  const q = (query || "").trim();
  if (!q) return null;

  const type = result?.type;
  const data = result?.data || {};

  if (type === "block") {
    return { path: `/block-info/${data.hash || q}` };
  }

  if (type === "transaction") {
    return { path: `/transaction-info/${data.hash || q}` };
  }

  if (type === "contract") {
    return { path: `/contract-info/${data.hash || q}` };
  }

  if (type === "address") {
    return { path: `/account-profile/${q}` };
  }

  if (type === "token") {
    return { path: `/nep17-token-info/${data.hash || q}` };
  }

  return { path: "/search", query: { q } };
}
