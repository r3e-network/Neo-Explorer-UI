import { CACHE_TTL } from "./cache";
import { createService } from "./serviceFactory";
import { executionService } from "./executionService";

/**
 * Transaction Service - Neo3 交易相关 API 调用
 * @module services/transactionService
 * @description 通过 neo3fura 后端获取交易数据
 */

export const transactionService = createService(
  {
    getCount: {
      cacheKey: "tx_count",
      rpcMethod: "GetTransactionCount",
      fallback: 0,
      ttl: CACHE_TTL.stats,
      realtime: true,
      buildParams: () => ({}),
    },
    getList: {
      _type: "list",
      cacheKey: "tx_list",
      rpcMethod: "GetTransactionList",
      errorLabel: "get transaction list",
      ttl: CACHE_TTL.chart,
      buildParams: ([limit = 20, skip = 0]) => ({ Limit: limit, Skip: skip }),
      buildCacheParams: ([limit = 20, skip = 0]) => ({ limit, skip }),
    },
    getByHash: {
      cacheKey: "tx_hash",
      rpcMethod: "GetRawTransactionByTransactionHash",
      fallback: null,
      ttl: CACHE_TTL.txDetail,
      buildParams: ([hash]) => ({ TransactionHash: hash }),
      buildCacheParams: ([hash]) => ({ hash }),
    },
    getCountByAddress: {
      cacheKey: "tx_count_address",
      rpcMethod: "GetTransactionCountByAddress",
      fallback: 0,
      ttl: CACHE_TTL.address,
      realtime: true,
      buildParams: ([address]) => ({ Address: address }),
      buildCacheParams: ([address]) => ({ address }),
    },
    getByAddress: {
      _type: "list",
      cacheKey: "tx_address_list",
      rpcMethod: "GetRawTransactionByAddress",
      errorLabel: "get transactions by address",
      ttl: CACHE_TTL.chart,
      buildParams: ([address, limit = 20, skip = 0]) => ({ Address: address, Limit: limit, Skip: skip }),
      buildCacheParams: ([address, limit = 20, skip = 0]) => ({ address, limit, skip }),
    },
    getNotificationsByTx: {
      _type: "list",
      cacheKey: "tx_notifications",
      rpcMethod: "GetNotificationByTransactionHash",
      errorLabel: "get notifications by tx",
      ttl: CACHE_TTL.trace,
      buildParams: ([txHash, limit = 20, skip = 0]) => ({ TransactionHash: txHash, Limit: limit, Skip: skip }),
      buildCacheParams: ([txHash, limit = 20, skip = 0]) => ({ txHash, limit, skip }),
    },
  },
  {
    /**
     * @deprecated Use executionService.getExecutionTrace directly — identical RPC call.
     */
    async getApplicationLog(txHash) {
      return executionService.getExecutionTrace(txHash);
    },
  }
);

export default transactionService;
