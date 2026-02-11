import { rpc } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";

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

export const statsService = {
  /**
   * 获取仪表盘统计数据（带缓存）
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

        // Extract values from different API response formats
        const blocks = blocksRes?.index || blocksRes?.["total counts"] || blocksRes?.total || 0;
        const txs = txsRes?.["total counts"] || txsRes?.total || txsRes?.index || 0;
        const contracts = contractsRes?.total || contractsRes?.["total counts"] || 0;
        const candidates = candidatesRes?.total || candidatesRes?.["total counts"] || 0;
        const addresses = addressesRes?.["total counts"] || addressesRes?.total || 0;
        const tokens = tokensRes?.total || tokensRes?.["total counts"] || 0;

        return { blocks, txs, contracts, candidates, addresses, tokens };
      } catch (error) {
        if (process.env.NODE_ENV !== "production") console.error("Failed to get dashboard stats:", error);
        return {
          blocks: 0,
          txs: 0,
          contracts: 0,
          candidates: 0,
          addresses: 0,
          tokens: 0,
        };
      }
    };

    return cachedRequest(key, fetchFn, CACHE_TTL.stats, { forceRefresh });
  },

  /**
   * 获取网络活动数据（用于图表，带缓存）
   * @param {number} [days=14] - 天数
   * @returns {Promise<Array>} 每日交易数据
   */
  async getNetworkActivity(days = 14) {
    const key = getCacheKey("network_activity", { days });

    return cachedRequest(
      key,
      async () => {
        try {
          return await rpc("GetDailyTransactions", { Days: days });
        } catch (error) {
          if (process.env.NODE_ENV !== "production") console.error("Failed to get network activity:", error);
          return [];
        }
      },
      CACHE_TTL.chart
    );
  },

  /**
   * 获取每小时交易数据
   * @param {number} [hours=24] - 小时数
   * @returns {Promise<Array>} 每小时交易数据
   */
  async getHourlyTransactions(hours = 24) {
    try {
      return await rpc("GetHourlyTransactions", { Hours: hours });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.error("Failed to get hourly transactions:", error.message);
      return [];
    }
  },

  /**
   * 获取 Gas 追踪数据（最新手续费 + 网络费用）
   * @returns {Promise<Object>} Gas 追踪数据
   */
  async getGasTracker() {
    const key = getCacheKey("gas_tracker", {});
    return cachedRequest(
      key,
      async () => {
        try {
          const [latestTxRes, feeRes] = await Promise.all([
            rpc("GetTransactionList", { Limit: 1, Skip: 0 }).catch(() => null),
            rpc("GetNetworkFee", {}).catch(() => null),
          ]);

          const latestTx = Array.isArray(latestTxRes?.result) ? latestTxRes.result[0] : null;

          return {
            latestNetworkFee: latestTx?.netfee ?? "0",
            latestSystemFee: latestTx?.sysfee ?? "0",
            networkFee: feeRes ?? null,
          };
        } catch (error) {
          if (process.env.NODE_ENV !== "production") console.error("Failed to get gas tracker:", error);
          return { latestNetworkFee: "0", latestSystemFee: "0", networkFee: null };
        }
      },
      CACHE_TTL.stats
    );
  },

  /**
   * 获取每日统计数据（用于图表，带缓存）
   * @param {number} [days=30] - 天数
   * @returns {Promise<Array>} 每日统计数据
   */
  async getDailyStats(days = 30) {
    const key = getCacheKey("daily_stats", { days });
    return cachedRequest(
      key,
      async () => {
        try {
          return await rpc("GetDailyTransactions", { Days: days });
        } catch (error) {
          if (process.env.NODE_ENV !== "production") console.error("Failed to get daily stats:", error);
          return [];
        }
      },
      CACHE_TTL.chart
    );
  },
};

export default statsService;
