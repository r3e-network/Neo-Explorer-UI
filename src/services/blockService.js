import { CACHE_TTL } from "./cache";
import { createService } from "./serviceFactory";

/**
 * Block Service - Neo3 区块相关 API 调用
 * @module services/blockService
 * @description 通过 neo3fura 后端获取区块数据
 */

export const blockService = createService({
  getCount: {
    cacheKey: "block_count",
    rpcMethod: "GetBlockCount",
    fallback: 0,
    ttl: CACHE_TTL.stats,
    realtime: true,
    buildParams: () => ({}),
  },
  getBestHash: {
    cacheKey: "block_best_hash",
    rpcMethod: "GetBestBlockHash",
    fallback: null,
    ttl: CACHE_TTL.block,
    realtime: true,
    buildParams: () => ({}),
  },
  getList: {
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
});

export default blockService;
