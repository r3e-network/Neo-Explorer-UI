import { safeRpc, safeRpcList } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { createService, getRealtimeListCacheOptions } from "./serviceFactory";
import { executionService } from "./executionService";
import { addressToScriptHash } from "../utils/neoHelpers";
import { neotubeService } from "./neotubeService";
import { getCurrentEnv } from "../utils/env";

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
    _getList: {
      _type: "list",
      cacheKey: "tx_list",
      rpcMethod: "GetTransactionList",
      realtime: true,
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
    getInternalTransactions: {
      _type: "list",
      cacheKey: "tx_internal",
      rpcMethod: "GetScCallByTransactionHash",
      errorLabel: "get internal transaction calls",
      ttl: CACHE_TTL.trace,
      buildParams: ([hash, limit = 20, skip = 0]) => ({ TransactionHash: hash, Limit: limit, Skip: skip }),
      buildCacheParams: ([hash, limit = 20, skip = 0]) => ({ hash, limit, skip }),
    },
    getCountByAddress: {
      cacheKey: "tx_count_address",
      rpcMethod: "GetTransactionCountByAddress",
      fallback: 0,
      ttl: CACHE_TTL.address,
      realtime: true,
      buildParams: ([address]) => ({ Address: addressToScriptHash(address) || address }),
      buildCacheParams: ([address]) => ({ address }),
    },
    _getByAddress: {
      _type: "list",
      cacheKey: "tx_address_list",
      rpcMethod: "GetRawTransactionByAddress",
      errorLabel: "get transactions by address",
      ttl: CACHE_TTL.chart,
      buildParams: ([address, limit = 20, skip = 0]) => ({ 
        Address: addressToScriptHash(address) || address, 
        Limit: limit, 
        Skip: skip 
      }),
      buildCacheParams: ([address, limit = 20, skip = 0]) => ({ address, limit, skip }),
    },
    // NOTE: Notifications are extracted from GetApplicationLogByTransactionHash
    // via executionService — no dedicated backend endpoint exists.
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

    async getCount(options = {}) {
      const key = getCacheKey("tx_count", {});
      return cachedRequest(
        key,
        async () => {
          const env = getCurrentEnv();
          const canUseNeoTube = this._shouldUseNeoTube(options) && neotubeService.supportsNetwork(env);

          if (canUseNeoTube) {
            try {
              const stats = await neotubeService.getStatistics(env);
              const fastCount = Number(stats?.txs || 0);
              if (fastCount > 0) return fastCount;
            } catch (error) {
              if (import.meta.env.DEV) console.warn("[transactionService] NeoTube tx count fallback:", error);
            }
          }

          const res = await safeRpc("GetTransactionCount", {}, 0, options);
          return this._extractCount(res);
        },
        CACHE_TTL.stats,
        getRealtimeListCacheOptions(options)
      );
    },

    async getList(limit = 20, skip = 0, options = {}) {
      const { enrichMissingFields = false, ...requestOptions } = options;

      const key = getCacheKey("tx_list", { limit, skip });
      const res = await cachedRequest(
        key,
        async () => {
          const env = getCurrentEnv();
          const canUseNeoTube = this._shouldUseNeoTube(requestOptions) && neotubeService.supportsNetwork(env);

          if (canUseNeoTube) {
            try {
              return await neotubeService.getLatestTransactions(limit, skip, env);
            } catch (error) {
              if (import.meta.env.DEV) {
                console.warn("[transactionService] NeoTube tx list fallback:", error);
              }
            }
          }

          return safeRpcList(
            "GetTransactionList",
            { Limit: limit, Skip: skip },
            "get transaction list",
            requestOptions
          );
        },
        CACHE_TTL.chart,
        getRealtimeListCacheOptions(requestOptions)
      );

      if (!res || !res.result) return res;

      const enriched = await Promise.all(
        res.result.map(async (tx) => {
          if (enrichMissingFields && tx.vmstate === undefined && tx.hash) {
            try {
              const full = await this.getByHash(tx.hash, requestOptions);
              if (full && full.vmstate) tx.vmstate = full.vmstate;
            } catch (e) { /* ignore */ }
          }
          return tx;
        })
      );
      return { ...res, result: enriched };
    },

    async getByAddress(address, limit = 20, skip = 0, options = {}) {
      const { enrichMissingFields = false, ...requestOptions } = options;
      const res = await this._getByAddress(address, limit, skip, requestOptions);
      if (!res || !res.result) return res;

      const enriched = await Promise.all(
        res.result.map(async (tx) => {
          if (enrichMissingFields && tx.vmstate === undefined && tx.hash) {
            try {
              const full = await this.getByHash(tx.hash, requestOptions);
              if (full && full.vmstate) tx.vmstate = full.vmstate;
            } catch (e) { /* ignore */ }
          }
          return tx;
        })
      );
      return { ...res, result: enriched };
    }
  }

);

export default transactionService;
