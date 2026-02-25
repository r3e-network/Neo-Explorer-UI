import { safeRpc, safeRpcList } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { createService, getRealtimeListCacheOptions } from "./serviceFactory";
import { neotubeService } from "./neotubeService";
import { getCurrentEnv } from "../utils/env";

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
    _shouldUseNeoTube(options = {}) {
      if (typeof options.useNeoTube === "boolean") return options.useNeoTube;
      return import.meta.env.MODE !== "test";
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
      const key = getCacheKey("block_count", {});
      return cachedRequest(
        key,
        async () => {
          const env = getCurrentEnv();
          const canUseNeoTube = this._shouldUseNeoTube(options) && neotubeService.supportsNetwork(env);

          if (canUseNeoTube) {
            try {
              const stats = await neotubeService.getStatistics(env);
              const fastCount = Number(stats?.blocks || 0);
              if (fastCount > 0) return fastCount;
            } catch (error) {
              if (import.meta.env.DEV) console.warn("[blockService] NeoTube block count fallback:", error);
            }
          }

          const res = await safeRpc("GetBlockCount", {}, null, options);
          return this._extractCount(res);
        },
        CACHE_TTL.stats,
        getRealtimeListCacheOptions(options)
      );
    },

    /**
     * Enriched block list with fees and primary info
     */
    async getList(limit = 20, skip = 0, options = {}) {
      const { enrichMissingFields = false, ...requestOptions } = options;

      const key = getCacheKey("block_list", { limit, skip });
      const res = await cachedRequest(
        key,
        async () => {
          const env = getCurrentEnv();
          const canUseNeoTube = this._shouldUseNeoTube(requestOptions) && neotubeService.supportsNetwork(env);

          if (canUseNeoTube) {
            try {
              return await neotubeService.getLatestBlocks(limit, skip, env);
            } catch (error) {
              if (import.meta.env.DEV) {
                console.warn("[blockService] NeoTube block list fallback:", error);
              }
            }
          }

          return safeRpcList(
            "GetBlockInfoList",
            { Limit: limit, Skip: skip },
            "get block list",
            requestOptions
          );
        },
        CACHE_TTL.chart,
        getRealtimeListCacheOptions(requestOptions)
      );

      if (!res || !res.result) return res;

      // Backfill missing fee/consensus fields only when unavailable in list payload.
      const enriched = await Promise.all(
        res.result.map(async (b) => {
          const missingFees = b.sysfee === undefined && b.systemFee === undefined;
          const missingNetFee = b.netfee === undefined && b.networkFee === undefined;
          const missingConsensus = b.nextconsensus === undefined && b.nextConsensus === undefined;
          const missingPrimary = b.primary === undefined;

          if (enrichMissingFields && (missingFees || missingNetFee || missingConsensus || missingPrimary)) {
            try {
              const full = await this.getByHeight(b.index, requestOptions);
              if (full) {
                b.sysfee = full.sysfee ?? full.systemFee;
                b.netfee = full.netfee ?? full.networkFee;
                b.primary = full.primary;
                b.nextconsensus = full.nextconsensus ?? full.nextConsensus;
              }
            } catch (e) {
              // Ignore individual block fetch errors
            }
          }
          return b;
        })
      );
      
      return { ...res, result: enriched };
    },
  }
);

export default blockService;
