import { rpc } from "./api";

/**
 * Stats Service - 仪表盘统计数据
 * @module services/statsService
 * @description 通过 neo3fura 获取网络统计信息
 */
export const statsService = {
  /**
   * 获取仪表盘统计数据
   * @returns {Promise<Object>} 包含 blocks, txs, contracts 等统计
   */
  async getDashboardStats() {
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
  },

  /**
   * 获取网络活动数据（用于图表）
   * @param {number} [days=14] - 天数
   * @returns {Promise<Array>} 每日交易数据
   */
  async getNetworkActivity(days = 14) {
    try {
      return await rpc("GetDailyTransactions", { Days: days });
    } catch (error) {
      console.error("Failed to get network activity:", error);
      return [];
    }
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
