import { rpc, safeRpc, safeRpcList } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { createService, getRealtimeListCacheOptions } from "./serviceFactory";
import { indexerReadService } from "./indexerReadService";

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

/**
 * Block Service - Neo3 区块相关 API 调用
 * @module services/blockService
 * @description 通过 neo3fura 后端获取区块数据
 */

export const blockService = createService(
  {
    getBestHash: {
      cacheKey: "block_best_hash",
      rpcMethod: "GetBestBlockHash",
      fallback: null,
      ttl: CACHE_TTL.block,
      realtime: true,
      buildParams: () => ({}),
    },
    _getList: {
      _type: "list",
      cacheKey: "block_list",
      rpcMethod: "GetBlockInfoList",
      errorLabel: "get block list",
      ttl: CACHE_TTL.chart,
      buildParams: ([limit = 20, skip = 0]) => ({ Limit: limit, Skip: skip }),
      buildCacheParams: ([limit = 20, skip = 0]) => ({ limit, skip }),
    },
    getByHash: {
      cacheKey: "block_hash",
      rpcMethod: "GetBlockByBlockHash",
      fallback: null,
      ttl: CACHE_TTL.block,
      buildParams: ([hash]) => ({ BlockHash: hash }),
      buildCacheParams: ([hash]) => ({ hash }),
    },
    getByHeight: {
      cacheKey: "block_height",
      rpcMethod: "GetBlockByBlockHeight",
      fallback: null,
      ttl: CACHE_TTL.block,
      buildParams: ([height]) => ({ BlockHeight: height }),
      buildCacheParams: ([height]) => ({ height }),
    },
    getInfoByHash: {
      cacheKey: "block_info_hash",
      rpcMethod: "GetBlockInfoByBlockHash",
      fallback: null,
      ttl: CACHE_TTL.block,
      buildParams: ([hash]) => ({ BlockHash: hash }),
      buildCacheParams: ([hash]) => ({ hash }),
    },
    getHeaderByHash: {
      cacheKey: "block_header_hash",
      rpcMethod: "GetBlockHeaderByBlockHash",
      fallback: null,
      ttl: CACHE_TTL.block,
      buildParams: ([hash]) => ({ BlockHash: hash }),
      buildCacheParams: ([hash]) => ({ hash }),
    },
    getHeaderByHeight: {
      cacheKey: "block_header_height",
      rpcMethod: "GetBlockHeaderByBlockHeight",
      fallback: null,
      ttl: CACHE_TTL.block,
      buildParams: ([height]) => ({ BlockHeight: height }),
      buildCacheParams: ([height]) => ({ height }),
    },
    getTransactionsByHash: {
      _type: "list",
      cacheKey: "block_transactions_hash",
      rpcMethod: "GetRawTransactionByBlockHash",
      errorLabel: "get transactions by block hash",
      ttl: CACHE_TTL.txDetail,
      realtime: false,
      buildParams: ([hash, limit = 20, skip = 0]) => ({ BlockHash: hash, Limit: limit, Skip: skip }),
      buildCacheParams: ([hash, limit = 20, skip = 0]) => ({ hash, limit, skip }),
    },
    getTransactionsByHeight: {
      _type: "list",
      cacheKey: "block_transactions_height",
      rpcMethod: "GetRawTransactionByBlockHeight",
      errorLabel: "get transactions by block height",
      ttl: CACHE_TTL.txDetail,
      realtime: false,
      buildParams: ([height, limit = 20, skip = 0]) => ({ BlockHeight: height, Limit: limit, Skip: skip }),
      buildCacheParams: ([height, limit = 20, skip = 0]) => ({ height, limit, skip }),
    },
    getStateRootRaw: {
      cacheKey: "block_stateroot",
      rpcMethod: "GetStateRoot",
      fallback: null,
      ttl: CACHE_TTL.block,
      buildParams: ([height]) => ({ BlockHeight: Number(height) }),
      buildCacheParams: ([height]) => ({ height: Number(height) }),
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
      const txCount = Number(b.txcount ?? b.tx_count ?? (Array.isArray(b.tx) ? b.tx.length : 0));
      return {
        ...b,
        hash: b.hash || "",
        index: Number.isFinite(index) ? index : 0,
        timestamp: Number(b.timestamp ?? b.time_ms ?? b.blocktime ?? 0),
        txcount: Number.isFinite(txCount) ? txCount : 0,
        transactioncount: Number.isFinite(txCount) ? txCount : 0,
        primary: b.primary ?? b.primary_node,
        nextconsensus: b.nextconsensus ?? b.next_consensus,
        speaker: b.speaker ?? b.nextconsensus ?? b.next_consensus,
        prevhash: b.prevhash ?? b.previous_block_hash,
      };
    },

    // Override getByHeight + getTransactionsByHeight to use standard
    // `getblock` first. The legacy GetBlockByBlockHeight Mongo wrapper
    // does proxy through to `getblock` upstream, but firing it from
    // the frontend wastes a hop. GetRawTransactionByBlockHeight
    // returns empty Mongo per live audit on /homepage and /block-info.
    async getByHeight(height, options = {}) {
      const cacheOpts = options;
      const numericHeight = Number(height);
      if (!Number.isFinite(numericHeight) || numericHeight < 0) return null;
      const key = getCacheKey("block_height", { height: numericHeight });
      return cachedRequest(
        key,
        async () => {
          // Standard getblock(height, true) — returns full block + tx
          // list in one round-trip. Replaces both legacy probes.
          try {
            const block = await safeRpc("getblock", [numericHeight, 1], null, cacheOpts);
            if (block && (block.hash || block.index !== undefined)) return block;
          } catch (err) {
            if (import.meta.env.DEV) console.warn("[blockService] getblock primary failed:", err);
          }
          // Legacy fallback for backends still routing through Mongo.
          return await safeRpc(
            "GetBlockByBlockHeight",
            { BlockHeight: numericHeight },
            null,
            cacheOpts,
          );
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
      return safeRpcList(
        "GetRawTransactionByBlockHeight",
        { BlockHeight: Number(height), Limit: limit, Skip: skip },
        "get transactions by block height",
        options,
      );
    },

    /**
     * Fetch the official state root for a block height. Primary path is
     * neo3fura's `GetStateRoot` (which proxies the Neo node's
     * `getstateroot`, with server-side LRU caching). Falls back to a
     * direct node RPC call if the neo3fura method is unavailable
     * (e.g. during a backend rollout window before the new handler is
     * deployed, or against a neo3fura instance that hasn't enabled it).
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

      // Primary: neo3fura GetStateRoot. We pass WithWitnesses=false (the
      // server default) since the explorer only needs the roothash —
      // skipping the witness array shaves ~600 bytes per response.
      try {
        const res = await this.getStateRootRaw(numericHeight, options);
        const roothash = res?.roothash || res?.rootHash;
        if (roothash) return roothash;
      } catch (e) {
        // Only fall back on errors that suggest the method itself is
        // missing. Genuine "block not yet has state root" responses
        // shouldn't trigger a fallback (the node will return the same
        // not-found from the lowercase path).
        if (!isMethodMissingError(e)) {
          if (import.meta.env.DEV) console.warn("[blockService] GetStateRoot upstream error:", e);
          return null;
        }
        if (import.meta.env.DEV) console.warn("[blockService] GetStateRoot not exposed, falling back to node RPC:", e);
      }

      // Fallback: direct node RPC (lowercase getstateroot) via the same proxy.
      const cacheOpts = getRealtimeListCacheOptions(options);
      const key = getCacheKey("block_stateroot_node", { height: numericHeight });
      return cachedRequest(
        key,
        async () => {
          try {
            const res = await rpc("getstateroot", [numericHeight], { suppressLog: true });
            return res?.roothash || res?.rootHash || null;
          } catch (e) {
            if (import.meta.env.DEV) console.warn("[blockService] getstateroot fallback failed:", e);
            return null;
          }
        },
        CACHE_TTL.block,
        cacheOpts,
      );
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
          // Indexer first — same Mongo→Postgres pattern as #171.
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
          } catch { /* fall through to legacy */ }
          return safeRpcList("GetBlockInfoList", { Limit: limit, Skip: skip }, "get block list", cacheOpts);
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
