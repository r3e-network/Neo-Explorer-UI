import { safeRpc } from "./api";

/**
 * Search Service - 全局搜索功能
 * @module services/searchService
 * @description 支持区块、交易、地址、合约的统一搜索
 */
export const searchService = {
  /**
   * 全局搜索
   * @param {string} query - 搜索关键词（区块高度/哈希/地址）
   * @returns {Promise<{type: string|null, data: Object|null}>} 搜索结果
   */
  async search(query) {
    const results = { type: null, data: null };
    query = (query || "").trim();
    if (!query || query.length > 256) return results;

    try {
      // 检查是否为区块高度（纯数字）
      if (/^\d+$/.test(query)) {
        const block = await safeRpc("GetBlockByBlockHeight", { BlockHeight: parseInt(query) }, null);
        if (block) {
          results.type = "block";
          results.data = block;
          return results;
        }
      }

      // 检查是否为哈希（64位十六进制）
      if (/^(0x)?[a-fA-F0-9]{64}$/.test(query)) {
        const hash = query.startsWith("0x") ? query : `0x${query}`;

        // 尝试区块
        const block = await safeRpc("GetBlockByBlockHash", { BlockHash: hash }, null);
        if (block) {
          results.type = "block";
          results.data = block;
          return results;
        }

        // 尝试交易
        const tx = await safeRpc("GetRawTransactionByTransactionHash", { TransactionHash: hash }, null);
        if (tx) {
          results.type = "transaction";
          results.data = tx;
          return results;
        }

        // 尝试合约
        const contract = await safeRpc("GetContractByContractHash", { ContractHash: hash }, null);
        if (contract) {
          results.type = "contract";
          results.data = contract;
          return results;
        }
      }

      // 检查是否为地址（N开头）
      if (/^N[A-Za-z0-9]{33}$/.test(query)) {
        const account = await safeRpc("GetAddressByAddress", { Address: query }, null);
        if (account) {
          results.type = "address";
          results.data = account;
          return results;
        }
      }
    } catch (error) {
      console.error("Search error:", error.message);
    }

    return results;
  },
};

export default searchService;
