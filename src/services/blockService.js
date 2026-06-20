import { safeRpc } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { createService, getRealtimeListCacheOptions } from "./serviceFactory";
import { indexerReadService } from "./indexerReadService";
import { getCurrentEnv, NET_ENV } from "../utils/env";

/**
 * Detect "method not exposed" errors so we know when to fall back to a
 * different RPC method. Two cases worth catching:
 *   - JSON-RPC -32601 "Method not found" (the canonical signal)
 *   - JSON-RPC -32600 "Invalid request" (what neo3fura returns for an
 *     unknown method when it falls through to the upstream proxy and the
 *     upstream node also rejects it)
 * Other errors (network, -106 not-yet-computed) should NOT trigger a
 * fallback — they'd produce the same response from the lowercase path.
 */
function isMethodMissingError(err) {
  const code = err?.rpc?.code ?? err?.code;
  if (code === -32601 || code === -32600) return true;
  const msg = String(err?.message || err?.rpc?.message || "").toLowerCase();
  return msg.includes("method not found") || msg.includes("invalid request");
}

function normalizeBlockTimestamp(block = {}) {
  const raw = block.timestamp ?? block.time_ms ?? block.time ?? block.blocktime ?? block.block_time_ms ?? 0;
  const timestamp = Number(raw);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizeBlockTxCount(block = {}) {
  const raw =
    block.txcount ??
    block.transactioncount ??
    block.txCount ??
    block.transactionCount ??
    block.tx_count ??
    block.transaction_count;
  const txCount = Number(raw);
  if (Number.isFinite(txCount)) return txCount;
  return Array.isArray(block.tx) ? block.tx.length : 0;
}

function normalizeRpcBlock(block) {
  if (!block || typeof block !== "object") return block;
  const timestamp = normalizeBlockTimestamp(block);
  const txCount = normalizeBlockTxCount(block);
  return {
    ...block,
    timestamp,
    txcount: txCount,
    transactioncount: txCount,
    prevhash: block.prevhash ?? block.previousblockhash ?? block.previous_block_hash,
    nextblockhash: block.nextblockhash ?? block.next_block_hash,
    nextconsensus: block.nextconsensus ?? block.next_consensus ?? block.nextConsensus,
  };
}

function parseNonNegativeInteger(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function normalizeValidatedStateRootPayload(payload, requestedHeight = null) {
  if (!payload || typeof payload !== "object") return null;

  const rootDoc = payload.stateRoot && typeof payload.stateRoot === "object" ? payload.stateRoot : payload;
  const roothash = rootDoc.roothash || rootDoc.rootHash || payload.roothash || payload.rootHash || "";
  const validatedRootIndex = parseNonNegativeInteger(
    payload.validatedrootindex ?? payload.validatedRootIndex ?? payload.validated_root_index ?? rootDoc.validatedrootindex,
  );
  const localRootIndex = parseNonNegativeInteger(
    payload.localrootindex ?? payload.localRootIndex ?? payload.local_root_index ?? rootDoc.localrootindex,
  );
  const rootIndex = parseNonNegativeInteger(rootDoc.index ?? payload.index);
  const requestedIndex = parseNonNegativeInteger(requestedHeight);
  const effectiveValidatedIndex = validatedRootIndex ?? rootIndex;
  const coveredByValidatedHeight =
    requestedIndex === null || effectiveValidatedIndex === null || requestedIndex <= effectiveValidatedIndex;
  const lag = parseNonNegativeInteger(payload.lag) ?? (
    localRootIndex !== null && effectiveValidatedIndex !== null
      ? Math.max(0, localRootIndex - effectiveValidatedIndex)
      : null
  );

  return {
    ...payload,
    ...rootDoc,
    roothash: coveredByValidatedHeight ? roothash : "",
    stateroot: coveredByValidatedHeight ? roothash : "",
    rootHash: coveredByValidatedHeight ? roothash : "",
    index: requestedIndex ?? rootIndex ?? effectiveValidatedIndex,
    requestedIndex: requestedIndex ?? rootIndex ?? effectiveValidatedIndex,
    validated: Boolean(roothash) && payload.validated !== false && coveredByValidatedHeight,
    available: Boolean(roothash) && coveredByValidatedHeight,
    source: payload.source || "StateService",
    validator: payload.validator || "StateValidator",
    localrootindex: localRootIndex ?? effectiveValidatedIndex,
    validatedrootindex: effectiveValidatedIndex,
    lag,
  };
}

function currentNetworkSlug() {
  return getCurrentEnv() === NET_ENV.TestT5 ? "testnet" : "mainnet";
}

async function fetchValidatedStateRootFromEdge(options = {}) {
  if (typeof fetch !== "function") {
    throw new Error("fetch is not available");
  }

  const endpoint = `/api/${currentNetworkSlug()}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getvalidatedstateroot",
      params: { WithWitnesses: false },
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    const error = new Error(`Validated state root request failed with HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const payload = await response.json();
  if (payload?.error) {
    const error = new Error(`RPC Error ${payload.error.code || ""}: ${payload.error.message || "Unknown RPC error"}`.trim());
    error.rpc = payload.error;
    throw error;
  }

  return payload?.result ?? null;
}

/**
 * Block Service - Neo3 区块相关 API 调用
 * @module services/blockService
 * @description 通过 neo3fura 后端获取区块数据
 */

export const blockService = createService(
  {
    getBestHash: {
      cacheKey: "block_best_hash",
      rpcMethod: "getbestblockhash",
      fallback: null,
      ttl: CACHE_TTL.block,
      realtime: true,
      buildParams: () => [],
    },
    getByHash: {
      cacheKey: "block_hash",
      rpcMethod: "getblock",
      fallback: null,
      ttl: CACHE_TTL.block,
      buildParams: ([hash]) => [hash, 1],
      buildCacheParams: ([hash]) => ({ hash }),
      transformResult: normalizeRpcBlock,
    },
    getInfoByHash: {
      cacheKey: "block_info_hash",
      rpcMethod: "getblock",
      fallback: null,
      ttl: CACHE_TTL.block,
      buildParams: ([hash]) => [hash, 1],
      buildCacheParams: ([hash]) => ({ hash }),
      transformResult: normalizeRpcBlock,
    },
    getHeaderByHash: {
      cacheKey: "block_header_hash",
      rpcMethod: "getblockheader",
      fallback: null,
      ttl: CACHE_TTL.block,
      buildParams: ([hash]) => [hash, 1],
      buildCacheParams: ([hash]) => ({ hash }),
      transformResult: normalizeRpcBlock,
    },
    getHeaderByHeight: {
      cacheKey: "block_header_height",
      rpcMethod: "getblockheader",
      fallback: null,
      ttl: CACHE_TTL.block,
      buildParams: ([height]) => [Number(height), 1],
      buildCacheParams: ([height]) => ({ height }),
      transformResult: normalizeRpcBlock,
    },
    getStateRootRaw: {
      cacheKey: "block_stateroot",
      rpcMethod: "getstateroot",
      fallback: null,
      ttl: CACHE_TTL.block,
      buildParams: ([height]) => [Number(height)],
      buildCacheParams: ([height]) => ({ height: Number(height) }),
    },
    getStateHeightRaw: {
      cacheKey: "block_state_height",
      rpcMethod: "getstateheight",
      fallback: null,
      ttl: CACHE_TTL.stats,
      realtime: true,
      buildParams: () => [],
    },
    getValidatedStateRootRaw: {
      cacheKey: "block_validated_stateroot",
      rpcMethod: "getvalidatedstateroot",
      fallback: null,
      ttl: CACHE_TTL.stats,
      realtime: true,
      buildParams: () => ({ WithWitnesses: false }),
      buildCacheParams: () => ({ latest: true }),
    },
  },
  {
    _computeTransactionFeeTotals(transactions = []) {
      return (Array.isArray(transactions) ? transactions : []).reduce(
        (sum, tx) => ({
          sysfee: sum.sysfee + Number(tx?.sysfee ?? tx?.systemFee ?? tx?.sys_fee ?? tx?.totalSysFee ?? 0),
          netfee: sum.netfee + Number(tx?.netfee ?? tx?.networkFee ?? tx?.net_fee ?? tx?.totalNetFee ?? 0),
        }),
        { sysfee: 0, netfee: 0 },
      );
    },

    _computeBlockFeeTotals(block = {}) {
      const directSysFee = Number(block.sysfee ?? block.systemFee ?? block.sys_fee ?? block.totalSysFee);
      const directNetFee = Number(block.netfee ?? block.networkFee ?? block.net_fee ?? block.totalNetFee);
      const txCount = Number(
        block.txcount ??
          block.transactioncount ??
          block.txCount ??
          block.transactionCount ??
          block.tx_count ??
          block.transaction_count ??
          (Array.isArray(block.tx) ? block.tx.length : 0),
      );

      const hasDirectSysFee = Number.isFinite(directSysFee);
      const hasDirectNetFee = Number.isFinite(directNetFee);
      const shouldUseTxFallback =
        Array.isArray(block.tx) &&
        block.tx.length > 0 &&
        txCount > 0 &&
        (!hasDirectSysFee || !hasDirectNetFee || (directSysFee === 0 && directNetFee === 0));

      if (!shouldUseTxFallback) {
        return {
          sysfee: hasDirectSysFee ? directSysFee : undefined,
          netfee: hasDirectNetFee ? directNetFee : undefined,
        };
      }

      return this._computeTransactionFeeTotals(block.tx);
    },

    _extractCount(res) {
      const direct = Number(res);
      if (Number.isFinite(direct)) return direct;
      if (!res) return 0;
      return res?.["total counts"] ?? res?.total ?? res?.index ?? res?.count ?? 0;
    },

    // Map the indexer's snake_case BlockListItem to the legacy field names
    // the existing block table renderers expect. Mirrors HomePage's
    // normalizeBlockSummary.
    _mapIndexerBlock(b = {}) {
      const index = Number(b.index ?? b.block_index ?? b.blockindex ?? 0);
      const txCount = normalizeBlockTxCount(b);
      return {
        ...b,
        hash: b.hash || "",
        index: Number.isFinite(index) ? index : 0,
        timestamp: normalizeBlockTimestamp(b),
        txcount: Number.isFinite(txCount) ? txCount : 0,
        transactioncount: Number.isFinite(txCount) ? txCount : 0,
        primary: b.primary ?? b.primary_node,
        nextconsensus: b.nextconsensus ?? b.next_consensus,
        speaker: b.speaker ?? b.nextconsensus ?? b.next_consensus,
        prevhash: b.prevhash ?? b.previousblockhash ?? b.previous_block_hash,
      };
    },

    // Use standard `getblock` so block detail works directly against neo-go.
    async getByHeight(height, options = {}) {
      const cacheOpts = options;
      const numericHeight = Number(height);
      if (!Number.isFinite(numericHeight) || numericHeight < 0) return null;
      const key = getCacheKey("block_height", { height: numericHeight });
      return cachedRequest(
        key,
        async () => {
          // Standard getblock(height, true) returns full block + tx list in
          // one round-trip.
          try {
            const block = await safeRpc("getblock", [numericHeight, 1], null, cacheOpts);
            if (block && (block.hash || block.index !== undefined)) return normalizeRpcBlock(block);
          } catch (err) {
            if (import.meta.env.DEV) console.warn("[blockService] getblock primary failed:", err);
          }
          return null;
        },
        CACHE_TTL.block,
        cacheOpts,
      );
    },

    async getTransactionsByHeight(height, limit = 20, skip = 0, options = {}) {
      // Standard `getblock` returns the full tx list inline; derive the
      // requested page from there. Avoids the empty-Mongo
      // GetRawTransactionByBlockHeight round-trip.
      const cacheOpts = options;
      try {
        const block = await this.getByHeight(height, cacheOpts);
        const allTxs = Array.isArray(block?.tx) ? block.tx : [];
        if (allTxs.length > 0) {
          const pageStart = Math.max(0, skip);
          const pageEnd = pageStart + Math.max(0, limit);
          return {
            result: allTxs.slice(pageStart, pageEnd),
            totalCount: allTxs.length,
          };
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn("[blockService] getblock-derived tx list failed:", err);
      }
      return { result: [], totalCount: 0 };
    },

    async getTransactionsByHash(hash, limit = 20, skip = 0, options = {}) {
      try {
        const block = await this.getByHash(hash, options);
        const allTxs = Array.isArray(block?.tx) ? block.tx : [];
        if (allTxs.length > 0) {
          const pageStart = Math.max(0, skip);
          const pageEnd = pageStart + Math.max(0, limit);
          return {
            result: allTxs.slice(pageStart, pageEnd),
            totalCount: allTxs.length,
          };
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn("[blockService] getblock(hash)-derived tx list failed:", err);
      }
      return { result: [], totalCount: 0 };
    },

    /**
     * Fetch the official state root for a block height from neo-go's
     * standard `getstateroot` method.
     *
     * State roots are produced by the StateRootService and reflect the
     * MPT root of the contract storage trie at the end of the block.
     * They are immutable per height — once computed they never change —
     * so both the server cache and the client-side cachedRequest TTL
     * can be aggressive. Returns the `roothash` string or null.
     */
    async getStateRoot(height, options = {}) {
      const numericHeight = Number(height);
      if (!Number.isFinite(numericHeight) || numericHeight < 0) return null;

      // Standard getstateroot. We only need the roothash.
      try {
        const res = await this.getStateRootRaw(numericHeight, options);
        const roothash = res?.roothash || res?.rootHash;
        if (roothash) return roothash;
      } catch (e) {
        if (!isMethodMissingError(e) && import.meta.env.DEV) console.warn("[blockService] getstateroot upstream error:", e);
      }
      return null;
    },

    async getValidatedStateRoot(options = {}) {
      const cacheOpts = getRealtimeListCacheOptions(options);

      try {
        const key = getCacheKey("block_validated_stateroot_edge", { latest: true });
        const fromBackend = await cachedRequest(
          key,
          () => fetchValidatedStateRootFromEdge(cacheOpts),
          CACHE_TTL.stats,
          cacheOpts,
        );
        const normalized = normalizeValidatedStateRootPayload(fromBackend);
        if (normalized?.validated && normalized.roothash) return normalized;
      } catch (e) {
        if (!isMethodMissingError(e) && import.meta.env.DEV) {
          console.warn("[blockService] getvalidatedstateroot upstream error:", e);
        }
      }

      try {
        const stateHeight = await this.getStateHeightRaw(cacheOpts);
        const validatedRootIndex = parseNonNegativeInteger(
          stateHeight?.validatedrootindex ?? stateHeight?.validatedRootIndex ?? stateHeight?.validated_root_index,
        );
        if (validatedRootIndex === null) return null;

        const root = await this.getStateRootRaw(validatedRootIndex, options);
        return normalizeValidatedStateRootPayload({
          ...(root || {}),
          validated: true,
          source: "StateService",
          validator: "StateValidator",
          localrootindex: stateHeight?.localrootindex ?? stateHeight?.localRootIndex,
          validatedrootindex: validatedRootIndex,
        });
      } catch (e) {
        if (import.meta.env.DEV) console.warn("[blockService] validated state root fallback failed:", e);
        return null;
      }
    },

    async getValidatedStateRootForBlock(height, options = {}) {
      const numericHeight = Number(height);
      if (!Number.isInteger(numericHeight) || numericHeight < 0) return null;

      const latest = await this.getValidatedStateRoot(options);
      if (!latest) return null;

      const validatedRootIndex = parseNonNegativeInteger(latest.validatedrootindex);
      if (validatedRootIndex !== null && numericHeight > validatedRootIndex) {
        return {
          ...latest,
          index: numericHeight,
          requestedIndex: numericHeight,
          roothash: "",
          stateroot: "",
          rootHash: "",
          validated: false,
          available: false,
        };
      }

      try {
        const root = await this.getStateRootRaw(numericHeight, options);
        return normalizeValidatedStateRootPayload({
          ...(root || {}),
          validated: true,
          source: latest.source,
          validator: latest.validator,
          localrootindex: latest.localrootindex,
          validatedrootindex: latest.validatedrootindex,
          lag: latest.lag,
        }, numericHeight);
      } catch (e) {
        if (!isMethodMissingError(e) && import.meta.env.DEV) {
          console.warn("[blockService] validated block state root fetch failed:", e);
        }
        return {
          ...latest,
          index: numericHeight,
          requestedIndex: numericHeight,
          roothash: "",
          stateroot: "",
          rootHash: "",
          validated: false,
          available: false,
        };
      }
    },

    /**
     * Get latest block height as a number
     */
    async getCount(options = {}) {
      const cacheOpts = getRealtimeListCacheOptions(options);
      const key = getCacheKey("block_count", {});
      return cachedRequest(
        key,
        async () => {
          // Indexer first — total_block_count tracks the chain tip and
          // outlives the legacy GetBlockCount handler. Same Mongo→Postgres
          // shift as #171.
          try {
            const summary = await indexerReadService.getSummary(cacheOpts);
            const fromSummary = Number(summary?.total_block_count ?? summary?.last_indexed_block);
            if (Number.isFinite(fromSummary) && fromSummary > 0) return fromSummary;
          } catch { /* fall through */ }
          // Standard `getblockcount` works against any Neo node and
          // outlives Mongo cleanup. Older Mongo `GetBlockCount` was
          // proxied here; switching to the lowercase canonical method
          // means the fallback also keeps working post-#184.
          const res = await safeRpc("getblockcount", [], null, cacheOpts);
          if (typeof res === "number") return res;
          return this._extractCount(res);
        },
        CACHE_TTL.stats,
        cacheOpts,
      );
    },

    /**
     * Enriched block list with fees and primary info
     */
    async getList(limit = 20, skip = 0, options = {}) {
      const { enrichMissingFields = false, ...requestOptions } = options;
      const cacheOpts = getRealtimeListCacheOptions(requestOptions);

      const key = getCacheKey("block_list", { limit, skip });
      const res = await cachedRequest(
        key,
        async () => {
          // Indexer first — same Mongo-to-Postgres pattern as #171.
          try {
            const [indexerRes, summary] = await Promise.all([
              indexerReadService.getBlocks(limit, skip, cacheOpts),
              indexerReadService.getSummary(cacheOpts).catch(() => null),
            ]);
            const rows = Array.isArray(indexerRes?.data) ? indexerRes.data : [];
            if (rows.length > 0) {
              const totalFromSummary = Number(summary?.total_block_count ?? summary?.last_indexed_block);
              return {
                result: rows.map(this._mapIndexerBlock),
                totalCount: Number(
                  indexerRes?.paging?.total
                    ?? (Number.isFinite(totalFromSummary) && totalFromSummary > 0 ? totalFromSummary : skip + rows.length),
                ),
              };
            }
          } catch { /* fall through to empty state */ }
          return { result: [], totalCount: 0 };
        },
        CACHE_TTL.chart,
        cacheOpts,
      );

      if (!res || !res.result) return res;

      // Backfill missing fee/consensus fields only when unavailable in list payload.
      const enriched = await Promise.all(
        res.result.map(async (b) => {
          const txCount = Number(
            b.txcount ??
              b.transactioncount ??
              b.txCount ??
              b.transactionCount ??
              b.tx_count ??
              b.transaction_count ??
              (Array.isArray(b.tx) ? b.tx.length : 0),
          );
          const currentSysFee = Number(b.sysfee ?? b.systemFee);
          const currentNetFee = Number(b.netfee ?? b.networkFee);
          const missingFees =
            (b.sysfee === undefined && b.systemFee === undefined) ||
            (Number.isFinite(currentSysFee) && currentSysFee === 0 && txCount > 0);
          const missingNetFee =
            (b.netfee === undefined && b.networkFee === undefined) ||
            (Number.isFinite(currentNetFee) && currentNetFee === 0 && txCount > 0);
          const missingConsensus = b.nextconsensus === undefined && b.nextConsensus === undefined;
          const missingPrimary = b.primary === undefined;

          if (enrichMissingFields && (missingFees || missingNetFee || missingConsensus || missingPrimary)) {
            try {
              const full = await this.getByHeight(b.index, requestOptions);
              if (full) {
                let feeTotals = this._computeBlockFeeTotals(full);
                const stillMissingFees =
                  txCount > 0 &&
                  (!Number.isFinite(feeTotals.sysfee) ||
                    !Number.isFinite(feeTotals.netfee) ||
                    (feeTotals.sysfee === 0 && feeTotals.netfee === 0));

                if (stillMissingFees) {
                  try {
                    const txRes = await this.getTransactionsByHeight(b.index, txCount, 0, requestOptions);
                    const txs = Array.isArray(txRes?.result) ? txRes.result : [];
                    if (txs.length > 0) {
                      feeTotals = this._computeTransactionFeeTotals(txs);
                    }
                  } catch (innerError) {
                    if (import.meta.env.DEV) console.warn("[blockService] transaction fee backfill failed:", innerError);
                  }
                }

                return {
                  ...b,
                  sysfee: feeTotals.sysfee,
                  netfee: feeTotals.netfee,
                  primary: full.primary,
                  nextconsensus: full.nextconsensus ?? full.nextConsensus,
                };
              }
            } catch (e) {
              if (import.meta.env.DEV) console.warn("[blockService] individual block enrichment failed:", e);
            }
          }
          return b;
        }),
      );

      return { ...res, result: enriched };
    },
  },
);

export default blockService;
