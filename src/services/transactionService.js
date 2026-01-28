import { rpc } from "./api";

/**
 * Transaction Service - All transaction-related API calls
 */
export const transactionService = {
  // Get total transaction count
  async getCount() {
    return rpc("GetTransactionCount");
  },

  // Get transaction list with pagination
  async getList(limit = 20, skip = 0) {
    return rpc("GetTransactionList", { Limit: limit, Skip: skip });
  },

  // Get transaction by hash
  async getByHash(hash) {
    return rpc("GetRawTransactionByTransactionHash", { TransactionHash: hash });
  },

  // Get transaction count by address
  async getCountByAddress(address) {
    return rpc("GetTransactionCountByAddress", { Address: address });
  },

  // Get transactions by address
  async getByAddress(address, limit = 20, skip = 0) {
    return rpc("GetRawTransactionByAddress", {
      Address: address,
      Limit: limit,
      Skip: skip,
    });
  },
};

export default transactionService;
