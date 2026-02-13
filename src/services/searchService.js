import { safeRpc } from "./api";

const MAX_SUGGESTIONS = 5;

/**
 * Search Service - 全局搜索功能
 * @module services/searchService
 * @description 支持区块、交易、地址、合约的统一搜索
 */
export const searchService = {
  /**
   * Get search suggestions (quick lookup for autocomplete)
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of suggestions with type and data
   */
  async getSuggestions(query) {
    const suggestions = [];
    query = (query || "").trim();
    if (!query || query.length < 2) return suggestions;

    try {
      // Search by block height
      if (/^\d+$/.test(query)) {
        const blockHeight = parseInt(query);
        if (blockHeight >= 0) {
          const block = await safeRpc(
            "GetBlockByBlockHeight",
            { BlockHeight: blockHeight },
            null
          );
          if (block) {
            suggestions.push({
              type: "block",
              label: `Block #${blockHeight}`,
              sublabel: `${block.txcount || 0} transactions`,
              data: block,
            });
          }
        }
      }

      // Search by hash prefix
      if (/^(0x)?[a-fA-F0-9]{4,}$/.test(query)) {
        const hashQuery = query.startsWith("0x") ? query : `0x${query}`;

        // Try to find transactions with matching prefix
        const txList = await safeRpc(
          "GetTransactions",
          { Limit: 10, BlockHeight: null },
          { result: [] }
        );
        const matchingTxs = (txList?.result || [])
          .filter((tx) =>
            tx.hash?.toLowerCase().startsWith(hashQuery.toLowerCase())
          )
          .slice(0, MAX_SUGGESTIONS);

        for (const tx of matchingTxs) {
          suggestions.push({
            type: "transaction",
            label: tx.hash.substring(0, 20) + "...",
            sublabel: `Block #${tx.blockindex}`,
            data: tx,
          });
        }

        // Try to find blocks with matching prefix
        const latestBlock = await safeRpc("GetBlockCount", {}, 0);
        if (typeof latestBlock === "number") {
          const searchHeight = Math.max(0, latestBlock - 100);
          for (
            let h = latestBlock;
            h >= searchHeight && suggestions.length < MAX_SUGGESTIONS * 2;
            h--
          ) {
            const block = await safeRpc(
              "GetBlockByBlockHeight",
              { BlockHeight: h },
              null
            );
            if (
              block?.hash?.toLowerCase().startsWith(hashQuery.toLowerCase())
            ) {
              suggestions.push({
                type: "block",
                label: `Block #${h}`,
                sublabel: block.hash.substring(0, 20) + "...",
                data: block,
              });
              break;
            }
          }
        }
      }

      // Search by address prefix
      if (/^N[A-Za-z0-9]{4,}$/.test(query)) {
        const addressList = await safeRpc(
          "GetAddressList",
          { Limit: 20, Skip: 0 },
          { result: [] }
        );
        const matchingAddresses = (addressList?.result || [])
          .filter((addr) =>
            addr.address?.toLowerCase().startsWith(query.toLowerCase())
          )
          .slice(0, MAX_SUGGESTIONS);

        for (const addr of matchingAddresses) {
          suggestions.push({
            type: "address",
            label: addr.address,
            sublabel: addr.balance ? `${addr.balance} NEO` : "No balance",
            data: addr,
          });
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production")
        console.error("Search suggestions error:", error.message);
    }

    return suggestions.slice(0, MAX_SUGGESTIONS * 2);
  },

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
        const block = await safeRpc(
          "GetBlockByBlockHeight",
          { BlockHeight: parseInt(query) },
          null
        );
        if (block) {
          results.type = "block";
          results.data = block;
          return results;
        }
      }

      // 检查是否为哈希（64位十六进制）— 并行查询
      if (/^(0x)?[a-fA-F0-9]{64}$/.test(query)) {
        const hash = query.startsWith("0x") ? query : `0x${query}`;

        const [
          blockResult,
          txResult,
          contractResult,
        ] = await Promise.allSettled([
          safeRpc("GetBlockByBlockHash", { BlockHash: hash }, null),
          safeRpc(
            "GetRawTransactionByTransactionHash",
            { TransactionHash: hash },
            null
          ),
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
        const account = await safeRpc(
          "GetAddressByAddress",
          { Address: query },
          null
        );
        if (account) {
          results.type = "address";
          results.data = account;
          return results;
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production")
        console.error("Search error:", error.message);
    }

    return results;
  },
};

export default searchService;
