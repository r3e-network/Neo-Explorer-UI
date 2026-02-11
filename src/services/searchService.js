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

      // 检查是否为哈希（64位十六进制）— 并行查询
      if (/^(0x)?[a-fA-F0-9]{64}$/.test(query)) {
        const hash = query.startsWith("0x") ? query : `0x${query}`;

        const [blockResult, txResult, contractResult] = await Promise.allSettled([
          safeRpc("GetBlockByBlockHash", { BlockHash: hash }, null),
          safeRpc("GetRawTransactionByTransactionHash", { TransactionHash: hash }, null),
          safeRpc("GetContractByContractHash", { ContractHash: hash }, null),
        ]);

        // 按优先级返回：block > tx > contract
        if (blockResult.status === "fulfilled" && blockResult.value) {
          results.type = "block";
          results.data = blockResult.value;
          return results;
        }
        if (txResult.status === "fulfilled" && txResult.value) {
          results.type = "transaction";
          results.data = txResult.value;
          return results;
        }
        if (contractResult.status === "fulfilled" && contractResult.value) {
          results.type = "contract";
          results.data = contractResult.value;
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
      if (process.env.NODE_ENV !== "production") console.error("Search error:", error.message);
    }

    return results;
  },
};

export default searchService;
