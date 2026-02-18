import { safeRpc } from "./api";
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
    // NOTE: Notifications are extracted from GetApplicationLogByTransactionHash
    // via executionService — no dedicated backend endpoint exists.
  },
  {
    /**
     * Fetch pending transactions from the mempool.
     * @param {number} [limit=20] - Max items to return.
     * @returns {Promise<Array>} Pending transaction list.
     */
    async getPendingTransactions(limit = 20) {
      const result = await safeRpc("getrawmempool", [true], []);
      if (!Array.isArray(result)) return [];
      return result.slice(0, limit).map((tx) => ({
        hash: tx.hash || tx.txid,
        from: tx.sender,
        to: tx.receiver || tx.outputs?.[0]?.address,
        netfee: tx.netfee,
        sysfee: tx.sysfee,
        timestamp: tx.timestamp || Date.now() / 1000,
      }));
    },

    /**
     * @deprecated Use executionService.getExecutionTrace directly — identical RPC call.
     */
    async getApplicationLog(txHash) {
      return executionService.getExecutionTrace(txHash);
    },
  }
);

export default transactionService;
