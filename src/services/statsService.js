import { rpc } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { createService } from "./serviceFactory";
import { getRealtimeListCacheOptions } from "./serviceFactory";

/**
 * Stats Service - 仪表盘统计数据
 * @module services/statsService
 * @description 通过 neo3fura 获取网络统计信息，带缓存支持
 */

const NETWORK_FEE_RATIO = 0.08;

/**
 * Calculate estimated network fee from GAS price.
 * @param {number} gasPrice - Current GAS price in USD
 * @returns {number} Estimated network fee (floored to 3 decimals)
 */
export function calculateNetworkFee(gasPrice) {
  return Number(Math.max(0, (gasPrice || 0) * NETWORK_FEE_RATIO).toFixed(3));
}

function extractCount(res) {
  if (!res) return 0;
  return res?.["total counts"] ?? res?.total ?? res?.index ?? res?.count ?? 0;
}

export const statsService = createService(
  {
    getNetworkActivity: {
      cacheKey: "network_activity",
      rpcMethod: "GetDailyTransactions",
      fallback: [],
      ttl: CACHE_TTL.chart,
      buildParams: ([days = 14]) => ({ Days: days }),
      buildCacheParams: ([days = 14]) => ({ days }),
    },
    getDailyStats: {
      cacheKey: "daily_stats",
      rpcMethod: "GetDailyTransactions",
      fallback: [],
      ttl: CACHE_TTL.chart,
      buildParams: ([days = 30]) => ({ Days: days }),
      buildCacheParams: ([days = 30]) => ({ days }),
    },
  },
  {
    /**
     * 获取仪表盘统计数据（带缓存）
     * Aggregates 6 parallel RPC calls — cannot be expressed as a single factory config.
     * @param {boolean} forceRefresh - 强制刷新
     * @returns {Promise<Object>} 包含 blocks, txs, contracts 等统计
     */
    async getDashboardStats(forceRefresh = false) {
      const key = getCacheKey("dashboard_stats", {});

      const fetchFn = async () => {
        try {
          const [blocksRes, txsRes, contractsRes, candidatesRes, addressesRes, tokensRes] = await Promise.all([
            rpc("GetBlockCount").catch(() => null),
            rpc("GetTransactionCount").catch(() => null),
            rpc("GetContractCount").catch(() => null),
            rpc("GetCandidateCount").catch(() => null),
            rpc("GetAddressCount").catch(() => null),
            rpc("GetAssetCount").catch(() => null),
          ]);

          return {
            blocks: extractCount(blocksRes),
            txs: extractCount(txsRes),
            contracts: extractCount(contractsRes),
            candidates: extractCount(candidatesRes),
            addresses: extractCount(addressesRes),
            tokens: extractCount(tokensRes),
          };
        } catch (error) {
          if (import.meta.env.DEV) console.error("Failed to get dashboard stats:", error);
          return { blocks: 0, txs: 0, contracts: 0, candidates: 0, addresses: 0, tokens: 0 };
        }
      };

      return cachedRequest(key, fetchFn, CACHE_TTL.chart, getRealtimeListCacheOptions({ forceRefresh }));
    },

    /**
     * 获取每小时交易数据
     * Uncached raw RPC call — intentionally not using factory caching.
     * @param {number} [hours=24] - 小时数
     * @returns {Promise<Array>} 每小时交易数据
     */
    async getHourlyTransactions(hours = 24) {
      try {
        return await rpc("GetHourlyTransactions", { Hours: hours });
      } catch (error) {
        if (import.meta.env.DEV) console.error("Failed to get hourly transactions:", error.message);
        return [];
      }
    },

    /**
     * 获取 Gas 追踪数据（最新手续费 + 网络费用）
     * Aggregates 2 parallel RPC calls — cannot be expressed as a single factory config.
     * @param {boolean} [forceRefresh=false] - 强制刷新
     * @returns {Promise<Object>} Gas 追踪数据
     */
    async getGasTracker(forceRefresh = false) {
      const key = getCacheKey("gas_tracker", {});
      return cachedRequest(
        key,
        async () => {
          try {
            const [latestTxRes, feeRes] = await Promise.all([
              rpc("GetTransactionList", { Limit: 1, Skip: 0 }).catch(() => null),
              rpc("GetNetFeeRange", {}).catch(() => null),
            ]);

            const latestTx = Array.isArray(latestTxRes?.result) ? latestTxRes.result[0] : null;

            return {
              latestNetworkFee: latestTx?.netfee ?? "0",
              latestSystemFee: latestTx?.sysfee ?? "0",
              networkFee: feeRes ?? null,
            };
          } catch (error) {
            if (import.meta.env.DEV) console.error("Failed to get gas tracker:", error);
            return { latestNetworkFee: "0", latestSystemFee: "0", networkFee: null };
          }
        },
        CACHE_TTL.chart,
        getRealtimeListCacheOptions({ forceRefresh })
      );
    },
  }
);

export default statsService;
