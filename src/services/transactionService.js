import { safeRpc, safeRpcList } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";

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
   * 获取交易列表（分页，带缓存）
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 交易列表
   */
  async getList(limit = 20, skip = 0) {
    const key = getCacheKey("tx_list", { limit, skip });
    return cachedRequest(
      key,
      () => safeRpcList("GetTransactionList", { Limit: limit, Skip: skip }, "get transaction list"),
      CACHE_TTL.txList
    );
  },

  /**
   * 根据哈希获取交易（带缓存）
   * @param {string} hash - 交易哈希
   * @returns {Promise<Object|null>} 交易数据
   */
  async getByHash(hash) {
    const key = getCacheKey("tx_hash", { hash });
    return cachedRequest(
      key,
      () => safeRpc("GetRawTransactionByTransactionHash", { TransactionHash: hash }, null),
      CACHE_TTL.txDetail
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
    return safeRpcList(
      "GetRawTransactionByAddress",
      { Address: address, Limit: limit, Skip: skip },
      "get transactions by address"
    );
  },

  /**
   * 获取交易的应用日志（带缓存，确认后不可变）
   * @param {string} txHash - 交易哈希
   * @returns {Promise<Object|null>} 应用日志数据
   */
  async getApplicationLog(txHash) {
    const key = getCacheKey("tx_applog", { txHash });
    return cachedRequest(key, () => safeRpc("GetApplicationLog", { TransactionHash: txHash }, null), CACHE_TTL.trace);
  },

  /**
   * 获取交易的通知列表（分页）
   * @param {string} txHash - 交易哈希
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 通知列表
   */
  async getNotificationsByTx(txHash, limit = 20, skip = 0) {
    return safeRpcList(
      "GetNotificationByTransactionHash",
      { TransactionHash: txHash, Limit: limit, Skip: skip },
      "get notifications by tx"
    );
  },
};

export default transactionService;
