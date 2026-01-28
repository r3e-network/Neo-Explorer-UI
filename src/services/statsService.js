import { rpc } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";

/**
 * Stats Service - 仪表盘统计数据
 * @module services/statsService
 * @description 通过 neo3fura 获取网络统计信息，带缓存支持
 */
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
        const [blocks, txs, contracts, candidates, addresses, tokens] =
          await Promise.all([
            rpc("GetBlockCount").catch(() => 0),
            rpc("GetTransactionCount").catch(() => 0),
            rpc("GetContractCount").catch(() => 0),
            rpc("GetCandidateCount").catch(() => 0),
            rpc("GetAddressCount").catch(() => 0),
            rpc("GetAssetCount").catch(() => 0),
          ]);
        return { blocks, txs, contracts, candidates, addresses, tokens };
      } catch (error) {
        console.error("Failed to get dashboard stats:", error);
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

    if (forceRefresh) {
      const data = await fetchFn();
      return data;
    }
    
    return cachedRequest(key, fetchFn, CACHE_TTL.stats);
  },

  /**
   * 获取网络活动数据（用于图表，带缓存）
   * @param {number} [days=14] - 天数
   * @returns {Promise<Array>} 每日交易数据
   */
  async getNetworkActivity(days = 14) {
    const key = getCacheKey("network_activity", { days });
    
    return cachedRequest(key, async () => {
      try {
        return await rpc("GetDailyTransactions", { Days: days });
      } catch (error) {
        console.error("Failed to get network activity:", error);
        return [];
      }
    }, CACHE_TTL.chart);
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
      console.error("Failed to get hourly transactions:", error.message);
      return [];
    }
  },
};

export default statsService;
