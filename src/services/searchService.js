import { safeRpc } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";

const MAX_SUGGESTIONS = 5;

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * In-flight request deduplication for _classifyAndDispatch.
 * Prevents duplicate RPC calls when the same query is dispatched concurrently
 * (e.g. rapid keystrokes triggering both getSuggestions and search).
 * @type {Map<string, Promise<Object>>}
 */
const _pending = new Map();

/**
 * Deduplicate concurrent calls sharing the same key.
 * Returns the existing promise if one is already in-flight; otherwise
 * executes `fn`, caches the promise, and cleans up on settlement.
 *
 * @param {string} key
 * @param {() => Promise<any>} fn
 * @returns {Promise<any>}
 */
function _dedupe(key, fn) {
  if (_pending.has(key)) return _pending.get(key);
  const p = fn().finally(() => _pending.delete(key));
  _pending.set(key, p);
  return p;
}

/**
 * Classify a query string and dispatch parallel RPC lookups.
 *
 * Returns raw lookup results keyed by type so callers can format them
 * differently (suggestions vs. single-result search).
 *
 * @param {string} query - Trimmed, validated query string.
 * @returns {Promise<{block?: Object, transaction?: Object, contract?: Object, address?: Object}>}
 * @private
 */
async function _classifyAndDispatch(query) {
  const hits = {};

  // Block height (pure digits)
  if (/^\d+$/.test(query)) {
    const blockHeight = parseInt(query);
    if (blockHeight >= 0) {
      const block = await safeRpc("GetBlockByBlockHeight", { BlockHeight: blockHeight }, null);
      if (block) hits.block = block;
    }
  }

  // Full hash (64 hex chars) — parallel exact lookups
  if (/^(0x)?[a-fA-F0-9]{64}$/.test(query)) {
    const hash = query.startsWith("0x") ? query : `0x${query}`;

    const [txResult, blockResult, contractResult] = await Promise.allSettled([
      safeRpc("GetRawTransactionByTransactionHash", { TransactionHash: hash }, null),
      safeRpc("GetBlockByBlockHash", { BlockHash: hash }, null),
      safeRpc("GetContractByContractHash", { ContractHash: hash }, null),
    ]);

    if (txResult.status === "fulfilled" && txResult.value) hits.transaction = txResult.value;
    if (blockResult.status === "fulfilled" && blockResult.value) hits.block = hits.block || blockResult.value;
    if (contractResult.status === "fulfilled" && contractResult.value) hits.contract = contractResult.value;
  }

  // Neo address (N + 33 alphanumeric)
  if (/^N[A-Za-z0-9]{33}$/.test(query)) {
    const account = await safeRpc("GetAddressByAddress", { Address: query }, null);
    if (account) hits.address = account;
  }

  return hits;
}

// ---------------------------------------------------------------------------
// Public service
// ---------------------------------------------------------------------------

/**
 * Search Service
 * @module services/searchService
 * @description Unified search across blocks, transactions, addresses, and contracts.
 */
export const searchService = {
  /**
   * Get search suggestions (quick lookup for autocomplete).
   *
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of suggestions with type and data
   */
  async getSuggestions(query) {
    query = (query || "").trim();
    if (!query || query.length < 2 || query.length > 256) return [];

    const key = getCacheKey("search_suggestions", { query });
    return cachedRequest(
      key,
      async () => {
        try {
          const hits = await _dedupe(query, () => _classifyAndDispatch(query));
          const suggestions = [];

          if (hits.block) {
            const b = hits.block;
            suggestions.push({
              type: "block",
              label: `Block #${b.index ?? query}`,
              sublabel: `${b.txcount || 0} transactions`,
              data: b,
            });
          }
          if (hits.transaction) {
            const tx = hits.transaction;
            suggestions.push({
              type: "transaction",
              label: tx.hash?.substring(0, 20) + "...",
              sublabel: `Block #${tx.blockindex ?? "?"}`,
              data: tx,
            });
          }
          if (hits.contract) {
            const c = hits.contract;
            suggestions.push({
              type: "contract",
              label: c.name || (c.hash || query).substring(0, 20) + "...",
              sublabel: "Contract",
              data: c,
            });
          }
          if (hits.address) {
            const a = hits.address;
            suggestions.push({
              type: "address",
              label: a.address || query,
              sublabel: a.balance ? `${a.balance} NEO` : "Address",
              data: a,
            });
          }

          return suggestions.slice(0, MAX_SUGGESTIONS);
        } catch (error) {
          if (import.meta.env.DEV) console.error("Search suggestions error:", error.message);
          return [];
        }
      },
      CACHE_TTL.block
    );
  },

  /**
   * Full search — returns the first matching result by priority.
   * @param {string} query
   * @returns {Promise<{type: string|null, data: Object|null}>}
   */
  async search(query) {
    query = (query || "").trim();
    if (!query || query.length > 256) return { type: null, data: null };

    const key = getCacheKey("search_main", { query });
    return cachedRequest(
      key,
      async () => {
        try {
          const hits = await _dedupe(query, () => _classifyAndDispatch(query));

          // Priority: block > transaction > contract > address
          if (hits.block) return { type: "block", data: hits.block };
          if (hits.transaction) return { type: "transaction", data: hits.transaction };
          if (hits.contract) return { type: "contract", data: hits.contract };
          if (hits.address) return { type: "address", data: hits.address };
        } catch (error) {
          if (import.meta.env.DEV) console.error("Search error:", error.message);
        }

        return { type: null, data: null };
      },
      CACHE_TTL.block
    );
  },
};

export default searchService;
