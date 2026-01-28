import { rpc, safeRpc, formatListResponse } from "./api";

/**
 * Contract Service - Neo3 合约相关 API 调用
 * @module services/contractService
 * @description 通过 neo3fura 后端获取智能合约数据
 */
export const contractService = {
  /**
   * 获取合约总数
   * @returns {Promise<number>} 合约数量
   */
  async getCount() {
    return safeRpc("GetContractCount", {}, 0);
  },

  /**
   * 获取合约列表（分页）
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 合约列表
   */
  async getList(limit = 20, skip = 0) {
    try {
      const result = await rpc("GetContractList", { Limit: limit, Skip: skip });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to get contract list:", error.message);
      return { result: [], totalCount: 0 };
    }
  },

  /**
   * 根据哈希获取合约
   * @param {string} hash - 合约哈希
   * @returns {Promise<Object|null>} 合约数据
   */
  async getByHash(hash) {
    return safeRpc("GetContractByContractHash", { ContractHash: hash }, null);
  },

  /**
   * 根据名称搜索合约
   * @param {string} name - 合约名称
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 搜索结果
   */
  async searchByName(name, limit = 20, skip = 0) {
    try {
      const result = await rpc("GetContractListByName", {
        Name: name,
        Limit: limit,
        Skip: skip,
      });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to search contracts:", error.message);
      return { result: [], totalCount: 0 };
    }
  },

  /**
   * 获取已验证合约的源代码
   * @param {string} hash - 合约哈希
   * @param {number} [updateCounter=0] - 更新计数器
   * @returns {Promise<Object|null>} 验证合约数据
   */
  async getVerifiedByHash(hash, updateCounter = 0) {
    return safeRpc(
      "GetVerifiedContractByContractHash",
      {
        ContractHash: hash,
        UpdateCounter: updateCounter,
      },
      null
    );
  },

  /**
   * 获取已验证合约列表
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 验证合约列表
   */
  async getVerifiedList(limit = 20, skip = 0) {
    try {
      const result = await rpc("GetVerifiedContracts", {
        Limit: limit,
        Skip: skip,
      });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to get verified contracts:", error.message);
      return { result: [], totalCount: 0 };
    }
  },
};

export default contractService;
