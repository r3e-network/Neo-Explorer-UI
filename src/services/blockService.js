import { safeRpc } from "./api";
import { CACHE_TTL } from "./cache";
import { createService } from "./serviceFactory";

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
    /**
     * Get latest block height as a number
     */
    async getCount(options = {}) {
      const res = await safeRpc("GetBlockCount", {}, null, options);
      if (!res) return 0;
      return res?.["total counts"] ?? res?.total ?? res?.index ?? res?.count ?? 0;
    },

    /**
     * Enriched block list with fees and primary info
     */
    async getList(limit = 20, skip = 0, options = {}) {
      const res = await this._getList(limit, skip, options);
      if (!res || !res.result) return res;

      // NGD Workaround: GetBlockInfoList omits fees and primary/nextconsensus. Fetch full block details.
      const enriched = await Promise.all(
        res.result.map(async (b) => {
          if (b.sysfee === undefined || b.primary === undefined || b.nextconsensus === undefined) {
            try {
              const full = await this.getByHeight(b.index, options);
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
