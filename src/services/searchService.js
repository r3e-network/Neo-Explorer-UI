import { safeRpc } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import nnsService from "./nnsService";
import { contractService } from "./contractService";
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
  const p = fn().finally(() => _pending.delete(key));
  _pending.set(key, p);
  return p;
}

/**
 * Lookup an account address with backend-compatibility fallback.
 * Neo3Fura-style backends may require script-hash form for address queries.
 *
 * @param {string} address
 * @returns {Promise<Object|null>}
 * @private
 */
async function _lookupAddress(address) {
  // Indexer first — same Mongo→Postgres pattern as #171/#172/#173. The
  // legacy GetAddressByAddress queries an unpopulated Mongo collection;
  // the indexer's per-account summary (tx_sent/tx_signed/balances) is
  // both authoritative and faster.
  try {
    const summary = await indexerReadService.getAccount(address);
    if (summary) {
      return {
        address,
        ...summary,
        // Preserve the legacy "balance" shape the search-bar suggestion
        // sublabel reads. Indexer doesn't return a top-level balance, so
        // surface the NEO net amount when present.
        balance: summary.balance ?? summary.nep17_net_raw ?? null,
      };
    }
  } catch { /* fall through to legacy */ }

  const scriptHash = addressToScriptHash(address);
  const candidates = [];
  if (scriptHash) candidates.push(scriptHash);
  if (!candidates.includes(address)) candidates.push(address);
  for (const candidate of candidates) {
    const account = await safeRpc("GetAddressByAddress", { Address: candidate }, null);
    if (account) return account;
  }
  return null;
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

  // Block height (pure digits) — standard getblock works regardless of
  // whether neo3fura_http is in the path; falls back to the legacy
  // PascalCase wrapper for backends that route through Mongo.
  if (/^\d+$/.test(query)) {
    const blockHeight = parseInt(query);
    if (blockHeight >= 0 && blockHeight < 100_000_000) {
      const block =
        (await safeRpc("getblock", [blockHeight, 1], null).catch(() => null)) ||
        (await safeRpc("GetBlockByBlockHeight", { BlockHeight: blockHeight }, null));
      if (block) hits.block = block;
    }
  }

  // Full hash (64 hex chars) — parallel exact lookups via standard
  // node RPCs (getrawtransaction, getblock, getcontractstate) which are
  // unaffected by the Mongo backend's removal. Each falls back to the
  // legacy PascalCase wrapper if the standard call returns null.
  if (/^(0x)?[a-fA-F0-9]{64}$/.test(query)) {
    const hash = query.startsWith("0x") ? query : `0x${query}`;
    const lookupTx = async () =>
      (await safeRpc("getrawtransaction", [hash, 1], null)) ||
      (await safeRpc("GetRawTransactionByTransactionHash", { TransactionHash: hash }, null));
    const lookupBlock = async () =>
      (await safeRpc("getblock", [hash, 1], null)) ||
      (await safeRpc("GetBlockByBlockHash", { BlockHash: hash }, null));
    const lookupContract = async () =>
      (await safeRpc("getcontractstate", [hash], null)) ||
      (await safeRpc("GetContractByContractHash", { ContractHash: hash }, null));

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
