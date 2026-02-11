import axios from "axios";
import { safeRpc, safeRpcList } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";

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
    const key = getCacheKey("contract_list", { limit, skip });
    return cachedRequest(
      key,
      () => safeRpcList("GetContractList", { Limit: limit, Skip: skip }, "get contract list"),
      CACHE_TTL.contract
    );
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
    return safeRpcList("GetContractListByName", { Name: name, Limit: limit, Skip: skip }, "search contracts");
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
    return safeRpcList("GetVerifiedContracts", { Limit: limit, Skip: skip }, "get verified contracts");
  },

  /**
   * 获取合约 SC 调用记录
   * @param {string} hash - 合约哈希
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} SC 调用列表
   */
  async getScCalls(hash, limit = 20, skip = 0) {
    return safeRpcList("GetScCallByContractHash", { ContractHash: hash, Limit: limit, Skip: skip }, "get SC calls");
  },

  /**
   * 获取合约事件通知列表
   * @param {string} hash - 合约哈希
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 事件列表
   */
  async getNotifications(hash, limit = 20, skip = 0) {
    return safeRpcList(
      "GetNotificationByContractHash",
      { ContractHash: hash, Limit: limit, Skip: skip },
      "get contract notifications"
    );
  },

  /**
   * 获取合约 manifest（带缓存，极少变更）
   * @param {string} hash - 合约哈希
   * @returns {Promise<Object|null>} manifest 数据
   */
  async getManifest(hash) {
    const key = getCacheKey("contract_manifest", { hash });
    return cachedRequest(
      key,
      async () => {
        const contract = await safeRpc("GetContractByContractHash", { ContractHash: hash }, null);
        return contract?.manifest ?? null;
      },
      CACHE_TTL.contract
    );
  },

  /**
   * 只读调用合约方法（不上链）
   * @param {string} hash - 合约哈希
   * @param {string} method - 方法名
   * @param {Array} [params=[]] - 调用参数
   * @returns {Promise<Object|null>} 调用结果
   */
  async invokeRead(hash, method, params = []) {
    return safeRpc("InvokeFunction", { ContractHash: hash, Operation: method, Args: params }, null);
  },

  /**
   * 上传合约源码进行验证
   * @param {string} nodeUrl - 验证节点 URL
   * @param {FormData} formData - 包含源码文件和合约信息的 FormData
   * @returns {Promise<Object>} 验证结果
   */
  async uploadVerification(nodeUrl, formData) {
    try {
      const { data } = await axios.post(nodeUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[contractService] uploadVerification failed:", err);
      }
      throw err;
    }
  },
};

export default contractService;
