import { safeRpc, safeRpcList } from "./api";

/**
 * Token Service - Neo3 代币相关 API 调用
 * @module services/tokenService
 * @description 通过 neo3fura 后端获取 NEP17/NEP11 代币数据
 */
export const tokenService = {
  /**
   * 获取 NEP17 代币列表
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 代币列表
   */
  async getNep17List(limit = 20, skip = 0) {
    return safeRpcList("GetAssetInfos", { Limit: limit, Skip: skip, Type: "NEP17" }, "get NEP17 list");
  },

  /**
   * 获取 NEP11 (NFT) 代币列表
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} NFT 列表
   */
  async getNep11List(limit = 20, skip = 0) {
    return safeRpcList("GetAssetInfos", { Limit: limit, Skip: skip, Type: "NEP11" }, "get NEP11 list");
  },

  /**
   * 根据哈希获取代币信息
   * @param {string} hash - 合约哈希
   * @returns {Promise<Object|null>} 代币数据
   */
  async getByHash(hash) {
    return safeRpc("GetAssetInfoByContractHash", { ContractHash: hash }, null);
  },

  /**
   * 获取代币持有者列表
   * @param {string} hash - 合约哈希
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 持有者列表
   */
  async getHolders(hash, limit = 20, skip = 0) {
    return safeRpcList(
      "GetAssetHoldersByContractHash",
      { ContractHash: hash, Limit: limit, Skip: skip },
      "get token holders"
    );
  },

  /**
   * 按名称搜索 NEP17 代币
   * @param {string} name - 代币名称
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 搜索结果
   */
  async searchNep17ByName(name, limit = 20, skip = 0) {
    return safeRpcList(
      "GetAssetInfosByName",
      { Name: name, Limit: limit, Skip: skip, Standard: "NEP17" },
      "search NEP17"
    );
  },

  /**
   * 按名称搜索 NEP11 代币
   * @param {string} name - 代币名称
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 搜索结果
   */
  async searchNep11ByName(name, limit = 20, skip = 0) {
    return safeRpcList(
      "GetAssetInfosByName",
      { Name: name, Limit: limit, Skip: skip, Standard: "NEP11" },
      "search NEP11"
    );
  },

  /**
   * 获取 NEP17 转账记录
   * @param {string} hash - 合约哈希
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 转账列表
   */
  async getNep17Transfers(hash, limit = 20, skip = 0) {
    return safeRpcList(
      "GetNep17TransferByContractHash",
      { ContractHash: hash, Limit: limit, Skip: skip },
      "get NEP17 transfers"
    );
  },

  /**
   * 获取 NEP11 转账记录
   * @param {string} hash - 合约哈希
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 转账列表
   */
  async getNep11Transfers(hash, limit = 20, skip = 0) {
    return safeRpcList(
      "GetNep11TransferByContractHash",
      { ContractHash: hash, Limit: limit, Skip: skip },
      "get NEP11 transfers"
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
  async getNep11TransfersByTokenId(hash, tokenId, limit = 20, skip = 0) {
    return safeRpcList(
      "GetNep11TransferByContractHashTokenId",
      { ContractHash: hash, tokenId: tokenId, Limit: limit, Skip: skip },
      "get NEP11 transfers by token"
    );
  },

  /**
   * 获取 NFT 资产持有者列表（含余额）
   * @param {string} hash - 合约哈希
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 持有者列表
   */
  async getNftHoldersList(hash, limit = 20, skip = 0) {
    return safeRpcList(
      "GetAssetHoldersListByContractHash",
      { ContractHash: hash, Limit: limit, Skip: skip, balance: 1 },
      "get NFT holders list"
    );
  },

  /**
   * 获取 NEP11 NFT 属性（名称、图片、描述等）
   * @param {string} hash - 合约哈希
   * @param {string[]} tokenIds - Token ID 数组
   * @returns {Promise<Object|null>} NFT 属性数据
   */
  async getNep11Properties(hash, tokenIds) {
    return safeRpc("GetNep11PropertiesByContractHashTokenId", { ContractHash: hash, tokenIds }, null);
  },
};

export default tokenService;
