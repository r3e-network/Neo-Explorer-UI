import { safeRpc } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import nnsService from "./nnsService";
import { contractService } from "./contractService";
import { accountService } from "./accountService";
import { indexerReadService } from "./indexerReadService";
import { addressToScriptHash } from "../utils/neoHelpers";
import { isValidNeoAddress } from "../utils/addressFormat";

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
  // Defensive cap: keys are user-supplied search strings; a request that never
  // settles (no abort) would otherwise leak. Entries self-clean on settle, so
  // this only catches pathological cases.
  if (_pending.size > 256) {
    _pending.clear();
  }
  const p = fn().finally(() => _pending.delete(key));
  _pending.set(key, p);
  return p;
}

function normalizeSearchHit(hit = {}) {
  const type = String(hit.type || "").trim().toLowerCase();
  const blockIndex = Number(hit.block_index ?? hit.blockIndex ?? hit.index);
  const data = {
    ...hit,
    hash: hit.hash || "",
    address: hit.address || "",
    index: Number.isFinite(blockIndex) ? blockIndex : hit.index,
    route: hit.route || "",
  };

  if (!data.hash && (type === "transaction" || type === "contract" || type === "token" || type === "block")) {
    data.hash = hit.id || "";
  }
  if (!data.address && type === "address") {
    data.address = hit.id || "";
  }

  return { type: type || null, data };
}

function searchTypeFromFilter(type) {
  const normalized = String(type || "").trim().toLowerCase();
  const map = {
    addresses: "address",
    blocks: "block",
    contracts: "contract",
    tokens: "token",
    transactions: "transaction",
  };
  return map[normalized] || normalized;
}

function formatSuggestionHit(hit = {}) {
  const normalized = normalizeSearchHit(hit);
  const data = normalized.data || {};
  const type = normalized.type || "unknown";
  const value =
    data.address ||
    data.hash ||
    (Number.isFinite(Number(data.index)) ? String(data.index) : "") ||
    data.title ||
    data.id ||
    "";

  return {
    type,
    label: data.title || data.subtitle || type,
    value,
    route: data.route || "",
    subtitle: data.subtitle || "",
    score: data.score,
  };
}

async function _searchSidecar(query, options = {}) {
  const response = await indexerReadService.search(query, options).catch(() => null);
  if (!response || !Array.isArray(response.hits) || response.hits.length === 0) {
    return null;
  }
  return response;
}

/**
 * @param {string} address
 * @returns {Promise<Object|null>}
 * @private
 */
async function _lookupAddress(address) {
  const scriptHash = addressToScriptHash(address);
  const account = await accountService.getByAddress(address).catch(() => null);
  if (account) return account;
  return { address: scriptHash || address };
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

  // Block height (pure digits) — standard getblock works directly against
  // neo-go.
  if (/^\d+$/.test(query)) {
    const blockHeight = parseInt(query);
    if (blockHeight >= 0 && blockHeight < 100_000_000) {
      const block = await safeRpc("getblock", [blockHeight, 1], null).catch(() => null);
      if (block) hits.block = block;
    }
  }

  // Full hash (64 hex chars) — parallel exact lookups via standard
  // node RPCs (getrawtransaction, getblock, getcontractstate) which are
  // unaffected by the Mongo backend's removal.
  if (/^(0x)?[a-fA-F0-9]{64}$/.test(query)) {
    const hash = query.startsWith("0x") ? query : `0x${query}`;
    const lookupTx = async () =>
      safeRpc("getrawtransaction", [hash, 1], null);
    const lookupBlock = async () =>
      safeRpc("getblock", [hash, 1], null);
    const lookupContract = async () =>
      safeRpc("getcontractstate", [hash], null);

    const [txResult, blockResult, contractResult] = await Promise.allSettled([
      lookupTx(),
      lookupBlock(),
      lookupContract(),
    ]);

    if (txResult.status === "fulfilled" && txResult.value) hits.transaction = txResult.value;
    if (blockResult.status === "fulfilled" && blockResult.value) hits.block = hits.block || blockResult.value;
    if (contractResult.status === "fulfilled" && contractResult.value) hits.contract = contractResult.value;
  }

  // Contract hash (40 hex chars) — getByHashWithFallback now goes
  // indexer-first per #173, so the redundant Mongo probe is gone.
  if (/^(0x)?[a-fA-F0-9]{40}$/.test(query)) {
    const hash = query.startsWith("0x") ? query : `0x${query}`;
    const contract = await contractService.getByHashWithFallback(hash);
    if (contract) hits.contract = contract;
  }

  // Neo address
  if (isValidNeoAddress(query)) {
    const account = await _lookupAddress(query);
    if (account) hits.address = account;
  }

  // NNS Domain (.neo or .matrix)
  if ((query.endsWith(".neo") && query.length > 4) || (query.endsWith(".matrix") && query.length > 7)) {
    const resolvedAddress = await nnsService.resolveDomain(query);
    if (resolvedAddress && isValidNeoAddress(resolvedAddress)) {
      const account = await _lookupAddress(resolvedAddress);
      if (account) {
        account.resolvedNns = query; // Add custom property
        hits.address = account;
      }
    }
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
          const sidecar = await _searchSidecar(query, { limit: 1 });
          if (sidecar?.hits?.[0]) {
            return normalizeSearchHit(sidecar.hits[0]);
          }

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

  async suggest(query, { type = "", limit = 6 } = {}) {
    query = (query || "").trim();
    if (!query || query.length > 256) return [];

    const response = await _searchSidecar(query, {
      type: searchTypeFromFilter(type),
      limit,
    });
    return (response?.hits || []).map(formatSuggestionHit).filter((hit) => hit.value || hit.route);
  },
};

export default searchService;
