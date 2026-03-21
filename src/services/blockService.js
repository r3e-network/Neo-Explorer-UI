import { safeRpc, safeRpcList } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { createService, getRealtimeListCacheOptions } from "./serviceFactory";

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
  },
  {
    _computeBlockFeeTotals(block = {}) {
      const directSysFee = Number(block.sysfee ?? block.systemFee);
      const directNetFee = Number(block.netfee ?? block.networkFee);
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

      const totals = block.tx.reduce(
        (sum, tx) => ({
          sysfee: sum.sysfee + Number(tx?.sysfee ?? tx?.systemFee ?? tx?.sys_fee ?? 0),
          netfee: sum.netfee + Number(tx?.netfee ?? tx?.networkFee ?? tx?.net_fee ?? 0),
        }),
        { sysfee: 0, netfee: 0 },
      );

      return totals;
    },

    _extractCount(res) {
      const direct = Number(res);
      if (Number.isFinite(direct)) return direct;
      if (!res) return 0;
      return res?.["total counts"] ?? res?.total ?? res?.index ?? res?.count ?? 0;
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
          const res = await safeRpc("GetBlockCount", {}, null, cacheOpts);
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
        () => safeRpcList("GetBlockInfoList", { Limit: limit, Skip: skip }, "get block list", cacheOpts),
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
                const feeTotals = this._computeBlockFeeTotals(full);
                b.sysfee = feeTotals.sysfee;
                b.netfee = feeTotals.netfee;
                b.primary = full.primary;
                b.nextconsensus = full.nextconsensus ?? full.nextConsensus;
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
