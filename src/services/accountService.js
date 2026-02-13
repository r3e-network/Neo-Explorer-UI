import { safeRpc, safeRpcList } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { getNetworkRefreshIntervalMs } from "../utils/env";

/**
 * Account Service - Neo3 账户相关 API 调用
 * @module services/accountService
 * @description 通过 neo3fura 后端获取账户数据
 */

const getRealtimeListCacheOptions = (options = {}) => ({
  staleWhileRevalidate: true,
  softTtl: getNetworkRefreshIntervalMs(),
  ...options,
});

export const accountService = {
  /**
   * 获取账户总数
   * @returns {Promise<number>} 账户数量
   */
  async getCount(options = {}) {
    const key = getCacheKey("account_count", {});
    return cachedRequest(
      key,
      () => safeRpc("GetAddressCount", {}, 0),
      CACHE_TTL.stats,
      getRealtimeListCacheOptions(options)
    );
  },

  /**
   * 获取账户列表（分页）
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @param {{ forceRefresh?: boolean }} [options={}] - 缓存控制
   * @returns {Promise<{result: Array, totalCount: number}>} 账户列表
   */
  async getList(limit = 20, skip = 0, options = {}) {
    const key = getCacheKey("account_list", { limit, skip });
    return cachedRequest(
      key,
      () =>
        safeRpcList(
          "GetAddressList",
          { Limit: limit, Skip: skip },
          "get account list"
        ),
      CACHE_TTL.chart,
      getRealtimeListCacheOptions(options)
    );
  },

  /**
   * 根据地址获取账户信息
   * @param {string} address - Neo3 地址
   * @param {{ forceRefresh?: boolean }} [options={}] - 缓存控制
   * @returns {Promise<Object|null>} 账户数据
   */
  async getByAddress(address, options = {}) {
    const key = getCacheKey("account_address", { address });
    return cachedRequest(
      key,
      () => safeRpc("GetAddressByAddress", { Address: address }, null),
      CACHE_TTL.address,
      getRealtimeListCacheOptions(options)
    );
  },

  /**
   * 获取账户持有的资产
   * @param {string} address - Neo3 地址
   * @returns {Promise<Array>} 资产列表
   */
  async getAssets(address, options = {}) {
    const key = getCacheKey("addr_assets", { address });
    return cachedRequest(
      key,
      () => safeRpc("GetAssetsHeldByAddress", { Address: address }, []),
      CACHE_TTL.token,
      getRealtimeListCacheOptions(options)
    );
  },

  /**
   * 获取账户代币持仓（带缓存）
   * @param {string} address - Neo3 地址
   * @returns {Promise<Array>} 代币持仓列表
   */
  async getTokenHoldings(address, options = {}) {
    const key = getCacheKey("addr_token_holdings", { address });
    return cachedRequest(
      key,
      () => safeRpc("GetAssetsHeldByAddress", { Address: address }, []),
      CACHE_TTL.token,
      getRealtimeListCacheOptions(options)
    );
  },

  /**
   * 获取地址的 NEP17 转账记录（分页）
   * @param {string} address - Neo3 地址
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @param {{ forceRefresh?: boolean }} [options={}] - 缓存控制
   * @returns {Promise<{result: Array, totalCount: number}>} 转账列表
   */
  async getNep17Transfers(address, limit = 20, skip = 0, options = {}) {
    const key = getCacheKey("account_nep17_transfers", {
      address,
      limit,
      skip,
    });
    return cachedRequest(
      key,
      () =>
        safeRpcList(
          "GetNep17TransferByAddress",
          { Address: address, Limit: limit, Skip: skip },
          "get NEP17 transfers by address"
        ),
      CACHE_TTL.chart,
      getRealtimeListCacheOptions(options)
    );
  },

  /**
   * 获取地址的 NEP11 转账记录（分页）
   * @param {string} address - Neo3 地址
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @param {{ forceRefresh?: boolean }} [options={}] - 缓存控制
   * @returns {Promise<{result: Array, totalCount: number}>} 转账列表
   */
  async getNep11Transfers(address, limit = 20, skip = 0, options = {}) {
    const key = getCacheKey("account_nep11_transfers", {
      address,
      limit,
      skip,
    });
    return cachedRequest(
      key,
      () =>
        safeRpcList(
          "GetNep11TransferByAddress",
          { Address: address, Limit: limit, Skip: skip },
          "get NEP11 transfers by address"
        ),
      CACHE_TTL.chart,
      getRealtimeListCacheOptions(options)
    );
  },
};

export default accountService;
