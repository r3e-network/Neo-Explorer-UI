import { safeRpc, safeRpcList } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";

/**
 * Block Service - Neo3 区块相关 API 调用
 * @module services/blockService
 * @description 通过 neo3fura 后端获取区块数据
 */
export const blockService = {
  /**
   * 获取区块总数
   * @returns {Promise<number>} 区块高度
   */
  async getCount() {
    return safeRpc("GetBlockCount", {}, 0);
  },

  /**
   * 获取最新区块哈希
   * @returns {Promise<string|null>} 区块哈希
   */
  async getBestHash() {
    return safeRpc("GetBestBlockHash", {}, null);
  },

  /**
   * 获取区块列表（分页，带缓存）
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 区块列表
   */
  async getList(limit = 20, skip = 0) {
    const key = getCacheKey("block_list", { limit, skip });
    return cachedRequest(
      key,
      () =>
        safeRpcList(
          "GetBlockInfoList",
          { Limit: limit, Skip: skip },
          "get block list"
        ),
      CACHE_TTL.list
    );
  },

  /**
   * 根据哈希获取区块（带缓存）
   * @param {string} hash - 区块哈希
   * @returns {Promise<Object|null>} 区块数据
   */
  async getByHash(hash) {
    const key = getCacheKey("block_hash", { hash });
    return cachedRequest(
      key,
      () => safeRpc("GetBlockByBlockHash", { BlockHash: hash }, null),
      CACHE_TTL.detail
    );
  },

  /**
   * 根据高度获取区块
   * @param {number} height - 区块高度
   * @returns {Promise<Object|null>} 区块数据
   */
  async getByHeight(height) {
    return safeRpc("GetBlockByBlockHeight", { BlockHeight: height }, null);
  },

  /**
   * 根据哈希获取区块信息
   * @param {string} hash - 区块哈希
   * @returns {Promise<Object|null>} 区块信息
   */
  async getInfoByHash(hash) {
    return safeRpc("GetBlockInfoByBlockHash", { BlockHash: hash }, null);
  },

  /**
   * 根据哈希获取区块头
   * @param {string} hash - 区块哈希
   * @returns {Promise<Object|null>} 区块头数据
   */
  async getHeaderByHash(hash) {
    return safeRpc("GetBlockHeaderByBlockHash", { BlockHash: hash }, null);
  },

  /**
   * 根据高度获取区块头
   * @param {number} height - 区块高度
   * @returns {Promise<Object|null>} 区块头数据
   */
  async getHeaderByHeight(height) {
    return safeRpc(
      "GetBlockHeaderByBlockHeight",
      { BlockHeight: height },
      null
    );
  },
};

export default blockService;
