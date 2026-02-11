import { safeRpc, safeRpcList } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";

/**
 * Account Service - Neo3 账户相关 API 调用
 * @module services/accountService
 * @description 通过 neo3fura 后端获取账户数据
 */
export const accountService = {
  /**
   * 获取账户总数
   * @returns {Promise<number>} 账户数量
   */
  async getCount() {
    return safeRpc("GetAddressCount", {}, 0);
  },

  /**
   * 获取账户列表（分页）
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 账户列表
   */
  async getList(limit = 20, skip = 0) {
    return safeRpcList("GetAddressList", { Limit: limit, Skip: skip }, "get account list");
  },

  /**
   * 根据地址获取账户信息
   * @param {string} address - Neo3 地址
   * @returns {Promise<Object|null>} 账户数据
   */
  async getByAddress(address) {
    return safeRpc("GetAddressByAddress", { Address: address }, null);
  },

  /**
   * 获取账户持有的资产
   * @param {string} address - Neo3 地址
   * @returns {Promise<Array>} 资产列表
   */
  async getAssets(address) {
    const key = getCacheKey("addr_assets", { address });
    return cachedRequest(key, () => safeRpc("GetAssetsHeldByAddress", { Address: address }, []), CACHE_TTL.token);
  },

  /**
   * 获取账户代币持仓（带缓存）
   * @param {string} address - Neo3 地址
   * @returns {Promise<Array>} 代币持仓列表
   */
  async getTokenHoldings(address) {
    const key = getCacheKey("addr_holdings", { address });
    return cachedRequest(key, () => safeRpc("GetAssetsHeldByAddress", { Address: address }, []), CACHE_TTL.stats);
  },

  /**
   * 获取地址的 NEP17 转账记录（分页）
   * @param {string} address - Neo3 地址
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 转账列表
   */
  async getNep17Transfers(address, limit = 20, skip = 0) {
    return safeRpcList(
      "GetNep17TransferByAddress",
      { Address: address, Limit: limit, Skip: skip },
      "get NEP17 transfers by address"
    );
  },

  /**
   * 获取地址的 NEP11 转账记录（分页）
   * @param {string} address - Neo3 地址
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 转账列表
   */
  async getNep11Transfers(address, limit = 20, skip = 0) {
    return safeRpcList(
      "GetNep11TransferByAddress",
      { Address: address, Limit: limit, Skip: skip },
      "get NEP11 transfers by address"
    );
  },
};

export default accountService;
