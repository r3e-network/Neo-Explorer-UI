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
  if (isValidTxHash(q) || /^(0x)?[0-9a-fA-F]{64}$/.test(q)) return "tx";

  // Contract hash (script hash length)
  if (/^(0x)?[0-9a-fA-F]{40}$/.test(q)) return "contract";

  // NNS Domain
  if ((q.endsWith(".neo") && q.length > 4) || (q.endsWith(".matrix") && q.length > 7)) return "address";

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
  const inferredType = detectSearchType(q);
  const resolvedType = type && type !== "unknown" ? type : inferredType;
  const ensure0x = (value) => (value && !value.startsWith("0x") ? `0x${value}` : value);

  if (resolvedType === "block") {
    return { path: `/block-info/${data.hash || q}` };
  }

  if (resolvedType === "transaction" || resolvedType === "tx") {
    return { path: `/transaction-info/${data.hash || q}` };
  }

  if (resolvedType === "contract") {
    return { path: `/contract-info/${data.hash || ensure0x(q)}` };
  }

  if (resolvedType === "address") {
    return { path: `/account-profile/${data.address || q}` };
  }

  if (resolvedType === "token") {
    return { path: `/nep17-token-info/${data.hash || q}` };
  }

  return { path: "/search", query: { q } };
}
