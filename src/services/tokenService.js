import { safeRpc, safeRpcList } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { getNetworkRefreshIntervalMs } from "../utils/env";

/**
 * Token Service - Neo3 代币相关 API 调用
 * @module services/tokenService
 * @description 通过 neo3fura 后端获取 NEP17/NEP11 代币数据
 */

const getRealtimeListCacheOptions = (options = {}) => ({
  staleWhileRevalidate: true,
  softTtl: getNetworkRefreshIntervalMs(),
  ...options,
});

export const tokenService = {
  /**
   * 获取 NEP17 代币列表
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @param {{ forceRefresh?: boolean }} [options={}] - 缓存控制
   * @returns {Promise<{result: Array, totalCount: number}>} 代币列表
   */
  async getNep17List(limit = 20, skip = 0, options = {}) {
    const key = getCacheKey("token_nep17_list", { limit, skip });
    return cachedRequest(
      key,
      () => safeRpcList("GetAssetInfos", { Limit: limit, Skip: skip, Type: "NEP17" }, "get NEP17 list"),
      CACHE_TTL.chart,
      getRealtimeListCacheOptions(options)
    );
  },

  /**
   * 获取 NEP11 (NFT) 代币列表
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @param {{ forceRefresh?: boolean }} [options={}] - 缓存控制
   * @returns {Promise<{result: Array, totalCount: number}>} NFT 列表
   */
  async getNep11List(limit = 20, skip = 0, options = {}) {
    const key = getCacheKey("token_nep11_list", { limit, skip });
    return cachedRequest(
      key,
      () => safeRpcList("GetAssetInfos", { Limit: limit, Skip: skip, Type: "NEP11" }, "get NEP11 list"),
      CACHE_TTL.chart,
      getRealtimeListCacheOptions(options)
    );
  },

  /**
   * 根据哈希获取代币信息
   * @param {string} hash - 合约哈希
   * @returns {Promise<Object|null>} 代币数据
   */
  async getByHash(hash, options = {}) {
    const key = getCacheKey("token_hash", { hash });
    return cachedRequest(
      key,
      () => safeRpc("GetAssetInfoByContractHash", { ContractHash: hash }, null),
      CACHE_TTL.token,
      options
    );
  },

  /**
   * 获取代币持有者列表
   * @param {string} hash - 合约哈希
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 持有者列表
   */
  async getHolders(hash, limit = 20, skip = 0, options = {}) {
    const key = getCacheKey("token_holders", { hash, limit, skip });
    return cachedRequest(
      key,
      () =>
        safeRpcList(
          "GetAssetHoldersByContractHash",
          { ContractHash: hash, Limit: limit, Skip: skip },
          "get token holders"
        ),
      CACHE_TTL.chart,
      getRealtimeListCacheOptions(options)
    );
  },

  /**
   * 按名称搜索 NEP17 代币
   * @param {string} name - 代币名称
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @param {{ forceRefresh?: boolean }} [options={}] - 缓存控制
   * @returns {Promise<{result: Array, totalCount: number}>} 搜索结果
   */
  async searchNep17ByName(name, limit = 20, skip = 0, options = {}) {
    const key = getCacheKey("token_nep17_search", { name, limit, skip });
    return cachedRequest(
      key,
      () =>
        safeRpcList(
          "GetAssetInfosByName",
          { Name: name, Limit: limit, Skip: skip, Standard: "NEP17" },
          "search NEP17"
        ),
      CACHE_TTL.chart,
      getRealtimeListCacheOptions(options)
    );
  },

  /**
   * 按名称搜索 NEP11 代币
   * @param {string} name - 代币名称
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @param {{ forceRefresh?: boolean }} [options={}] - 缓存控制
   * @returns {Promise<{result: Array, totalCount: number}>} 搜索结果
   */
  async searchNep11ByName(name, limit = 20, skip = 0, options = {}) {
    const key = getCacheKey("token_nep11_search", { name, limit, skip });
    return cachedRequest(
      key,
      () =>
        safeRpcList(
          "GetAssetInfosByName",
          { Name: name, Limit: limit, Skip: skip, Standard: "NEP11" },
          "search NEP11"
        ),
      CACHE_TTL.chart,
      getRealtimeListCacheOptions(options)
    );
  },

  /**
   * 获取 NEP17 转账记录
   * @param {string} hash - 合约哈希
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 转账列表
   */
  async getNep17Transfers(hash, limit = 20, skip = 0, options = {}) {
    const key = getCacheKey("token_nep17_transfers", { hash, limit, skip });
    return cachedRequest(
      key,
      () =>
        safeRpcList(
          "GetNep17TransferByContractHash",
          { ContractHash: hash, Limit: limit, Skip: skip },
          "get NEP17 transfers"
        ),
      CACHE_TTL.chart,
      getRealtimeListCacheOptions(options)
    );
  },

  /**
   * 获取 NEP11 转账记录
   * @param {string} hash - 合约哈希
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 转账列表
   */
  async getNep11Transfers(hash, limit = 20, skip = 0, options = {}) {
    const key = getCacheKey("token_nep11_transfers", { hash, limit, skip });
    return cachedRequest(
      key,
      () =>
        safeRpcList(
          "GetNep11TransferByContractHash",
          { ContractHash: hash, Limit: limit, Skip: skip },
          "get NEP11 transfers"
        ),
      CACHE_TTL.chart,
      getRealtimeListCacheOptions(options)
    );
  },

  /**
   * 获取指定 TokenId 的 NEP11 转账记录
   * @param {string} hash - 合约哈希
   * @param {string} tokenId - Token ID
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 转账列表
   */
  async getNep11TransfersByTokenId(hash, tokenId, limit = 20, skip = 0, options = {}) {
    const key = getCacheKey("token_nep11_transfers_token", { hash, tokenId, limit, skip });
    return cachedRequest(
      key,
      () =>
        safeRpcList(
          "GetNep11TransferByContractHashTokenId",
          { ContractHash: hash, tokenId: tokenId, Limit: limit, Skip: skip },
          "get NEP11 transfers by token"
        ),
      CACHE_TTL.chart,
      getRealtimeListCacheOptions(options)
    );
  },

  /**
   * 获取 NFT 资产持有者列表（含余额）
   * @param {string} hash - 合约哈希
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 持有者列表
   */
  async getNftHoldersList(hash, limit = 20, skip = 0, options = {}) {
    const key = getCacheKey("token_nft_holders", { hash, limit, skip });
    return cachedRequest(
      key,
      () =>
        safeRpcList(
          "GetAssetHoldersListByContractHash",
          { ContractHash: hash, Limit: limit, Skip: skip, balance: 1 },
          "get NFT holders list"
        ),
      CACHE_TTL.chart,
      getRealtimeListCacheOptions(options)
    );
  },

  /**
   * 获取 NEP11 NFT 属性（名称、图片、描述等）
   * @param {string} hash - 合约哈希
   * @param {string[]} tokenIds - Token ID 数组
   * @returns {Promise<Object|null>} NFT 属性数据
   */
  async getNep11Properties(hash, tokenIds, options = {}) {
    const key = getCacheKey("token_nep11_properties", { hash, tokenIds });
    return cachedRequest(
      key,
      () => safeRpc("GetNep11PropertiesByContractHashTokenId", { ContractHash: hash, tokenIds }, null),
      CACHE_TTL.token,
      options
    );
  },

  /**
   * 根据交易哈希获取 NEP17 转账记录（分页）
   * @param {string} txHash - 交易哈希
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 转账列表
   */
  async getTransfersByTxHash(txHash, limit = 20, skip = 0, options = {}) {
    const key = getCacheKey("token_nep17_transfers_tx", { txHash, limit, skip });
    return cachedRequest(
      key,
      () =>
        safeRpcList(
          "GetNep17TransferByTransactionHash",
          { TransactionHash: txHash, Limit: limit, Skip: skip },
          "get NEP17 transfers by tx"
        ),
      CACHE_TTL.trace,
      getRealtimeListCacheOptions(options)
    );
  },

  /**
   * 根据交易哈希获取 NEP11 转账记录（分页）
   * @param {string} txHash - 交易哈希
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 转账列表
   */
  async getNep11TransfersByTxHash(txHash, limit = 20, skip = 0, options = {}) {
    const key = getCacheKey("token_nep11_transfers_tx", { txHash, limit, skip });
    return cachedRequest(
      key,
      () =>
        safeRpcList(
          "GetNep11TransferByTransactionHash",
          { TransactionHash: txHash, Limit: limit, Skip: skip },
          "get NEP11 transfers by tx"
        ),
      CACHE_TTL.trace,
      getRealtimeListCacheOptions(options)
    );
  },
};

export default tokenService;
