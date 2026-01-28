import { rpc, safeRpc, formatListResponse } from "./api";

/**
 * Transaction Service - Neo3 交易相关 API 调用
 * @module services/transactionService
 * @description 通过 neo3fura 后端获取交易数据
 */
export const transactionService = {
  /**
   * 获取交易总数
   * @returns {Promise<number>} 交易数量
   */
  async getCount() {
    return safeRpc("GetTransactionCount", {}, 0);
  },

  /**
   * 获取交易列表（分页）
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 交易列表
   */
  async getList(limit = 20, skip = 0) {
    try {
      const result = await rpc("GetTransactionList", {
        Limit: limit,
        Skip: skip,
      });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to get transaction list:", error.message);
      return { result: [], totalCount: 0 };
    }
  },

  /**
   * 根据哈希获取交易
   * @param {string} hash - 交易哈希
   * @returns {Promise<Object|null>} 交易数据
   */
  async getByHash(hash) {
    return safeRpc(
      "GetRawTransactionByTransactionHash",
      { TransactionHash: hash },
      null
    );
  },

  /**
   * 获取地址的交易数量
   * @param {string} address - Neo3 地址
   * @returns {Promise<number>} 交易数量
   */
  async getCountByAddress(address) {
    return safeRpc("GetTransactionCountByAddress", { Address: address }, 0);
  },

  /**
   * 获取地址的交易列表
   * @param {string} address - Neo3 地址
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 交易列表
   */
  async getByAddress(address, limit = 20, skip = 0) {
    try {
      const result = await rpc("GetRawTransactionByAddress", {
        Address: address,
        Limit: limit,
        Skip: skip,
      });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to get transactions by address:", error.message);
      return { result: [], totalCount: 0 };
    }
  },
};

export default transactionService;
