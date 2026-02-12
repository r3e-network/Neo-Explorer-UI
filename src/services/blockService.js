import { safeRpc, safeRpcList } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { getNetworkRefreshIntervalMs } from "../utils/env";

/**
 * Block Service - Neo3 区块相关 API 调用
 * @module services/blockService
 * @description 通过 neo3fura 后端获取区块数据
 */

const getRealtimeListCacheOptions = (options = {}) => ({
  staleWhileRevalidate: true,
  softTtl: getNetworkRefreshIntervalMs(),
  ...options,
});

export const blockService = {
  /**
   * 获取区块总数
   * @returns {Promise<number>} 区块高度
   */
  async getCount(options = {}) {
    const key = getCacheKey("block_count", {});
    return cachedRequest(
      key,
      () => safeRpc("GetBlockCount", {}, 0),
      CACHE_TTL.stats,
      getRealtimeListCacheOptions(options)
    );
  },

  /**
   * 获取最新区块哈希
   * @returns {Promise<string|null>} 区块哈希
   */
  async getBestHash(options = {}) {
    const key = getCacheKey("block_best_hash", {});
    return cachedRequest(
      key,
      () => safeRpc("GetBestBlockHash", {}, null),
      CACHE_TTL.block,
      getRealtimeListCacheOptions(options)
    );
  },

  /**
   * 获取区块列表（分页，带缓存）
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @param {{ forceRefresh?: boolean }} [options={}] - 缓存控制
   * @returns {Promise<{result: Array, totalCount: number}>} 区块列表
   */
  async getList(limit = 20, skip = 0, options = {}) {
    const key = getCacheKey("block_list", { limit, skip });
    return cachedRequest(
      key,
      () => safeRpcList("GetBlockInfoList", { Limit: limit, Skip: skip }, "get block list"),
      CACHE_TTL.chart,
      getRealtimeListCacheOptions(options)
    );
  },

  /**
   * 根据哈希获取区块（带缓存）
   * @param {string} hash - 区块哈希
   * @returns {Promise<Object|null>} 区块数据
   */
  async getByHash(hash, options = {}) {
    const key = getCacheKey("block_hash", { hash });
    return cachedRequest(
      key,
      () => safeRpc("GetBlockByBlockHash", { BlockHash: hash }, null),
      CACHE_TTL.txDetail,
      options
    );
  },

  /**
   * 根据高度获取区块
   * @param {number} height - 区块高度
   * @returns {Promise<Object|null>} 区块数据
   */
  async getByHeight(height, options = {}) {
    const key = getCacheKey("block_height", { height });
    return cachedRequest(
      key,
      () => safeRpc("GetBlockByBlockHeight", { BlockHeight: height }, null),
      CACHE_TTL.txDetail,
      options
    );
  },

  /**
   * 根据哈希获取区块信息
   * @param {string} hash - 区块哈希
   * @returns {Promise<Object|null>} 区块信息
   */
  async getInfoByHash(hash, options = {}) {
    const key = getCacheKey("block_info_hash", { hash });
    return cachedRequest(
      key,
      () => safeRpc("GetBlockInfoByBlockHash", { BlockHash: hash }, null),
      CACHE_TTL.block,
      options
    );
  },

  /**
   * 根据哈希获取区块头
   * @param {string} hash - 区块哈希
   * @returns {Promise<Object|null>} 区块头数据
   */
  async getHeaderByHash(hash, options = {}) {
    const key = getCacheKey("block_header_hash", { hash });
    return cachedRequest(
      key,
      () => safeRpc("GetBlockHeaderByBlockHash", { BlockHash: hash }, null),
      CACHE_TTL.block,
      options
    );
  },

  /**
   * 根据高度获取区块头
   * @param {number} height - 区块高度
   * @returns {Promise<Object|null>} 区块头数据
   */
  async getHeaderByHeight(height, options = {}) {
    const key = getCacheKey("block_header_height", { height });
    return cachedRequest(
      key,
      () => safeRpc("GetBlockHeaderByBlockHeight", { BlockHeight: height }, null),
      CACHE_TTL.block,
      options
    );
  },

  /**
   * 根据区块哈希获取交易列表（分页）
   * @param {string} hash - 区块哈希
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 交易列表
   */
  async getTransactionsByHash(hash, limit = 20, skip = 0, options = {}) {
    const key = getCacheKey("block_transactions_hash", { hash, limit, skip });
    return cachedRequest(
      key,
      () =>
        safeRpcList(
          "GetRawTransactionByBlockHash",
          { BlockHash: hash, Limit: limit, Skip: skip },
          "get transactions by block hash"
        ),
      CACHE_TTL.txDetail,
      options
    );
  },

  /**
   * 根据区块高度获取交易列表（分页）
   * @param {number} height - 区块高度
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 交易列表
   */
  async getTransactionsByHeight(height, limit = 20, skip = 0, options = {}) {
    const key = getCacheKey("block_transactions_height", { height, limit, skip });
    return cachedRequest(
      key,
      () =>
        safeRpcList(
          "GetRawTransactionByBlockHeight",
          { BlockHeight: height, Limit: limit, Skip: skip },
          "get transactions by block height"
        ),
      CACHE_TTL.txDetail,
      options
    );
  },
};

export default blockService;
