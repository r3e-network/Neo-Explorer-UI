import { rpc, safeRpc, formatListResponse } from "./api";

/**
 * Transaction Service - All transaction-related API calls
 */
export const transactionService = {
  // Get total transaction count
  async getCount() {
    return safeRpc("GetTransactionCount", {}, 0);
  },

  // Get transaction list with pagination
  async getList(limit = 20, skip = 0) {
    try {
      const result = await rpc("GetTransactionList", { Limit: limit, Skip: skip });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to get transaction list:", error.message);
      return { result: [], totalCount: 0 };
    }
  },

  // Get transaction by hash
  async getByHash(hash) {
    return safeRpc("GetRawTransactionByTransactionHash", { TransactionHash: hash }, null);
  },

  // Get transaction count by address
  async getCountByAddress(address) {
    return safeRpc("GetTransactionCountByAddress", { Address: address }, 0);
  },

  // Get transactions by address
  async getByAddress(address, limit = 20, skip = 0) {
    try {
      const result = await rpc("GetRawTransactionByAddress", {
        Address: address,
        Limit: limit,
        Skip: skip,
      });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to get transactions by address:", error.message);
      return { result: [], totalCount: 0 };
    }
  },
};

export default transactionService;
