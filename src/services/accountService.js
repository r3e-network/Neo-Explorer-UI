import { rpc, safeRpc, formatListResponse } from "./api";

/**
 * Account Service - Neo3 账户相关 API 调用
 * @module services/accountService
 * @description 通过 neo3fura 后端获取账户数据
 */
export const accountService = {
  /**
   * 获取账户列表（分页）
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 账户列表
   */
  async getList(limit = 20, skip = 0) {
    try {
      const result = await rpc("GetAddressList", { Limit: limit, Skip: skip });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to get account list:", error.message);
      return { result: [], totalCount: 0 };
    }
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
    return safeRpc("GetAssetsHeldByAddress", { Address: address }, []);
  },

  /**
   * 获取账户余额（getAssets 别名）
   * @param {string} address - Neo3 地址
   * @returns {Promise<Array>} 资产余额列表
   */
  async getBalance(address) {
    return safeRpc("GetAssetsHeldByAddress", { Address: address }, []);
  },
};

export default accountService;
