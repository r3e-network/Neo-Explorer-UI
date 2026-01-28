import { rpc, safeRpc, formatListResponse } from "./api";

/**
 * Account Service - All account-related API calls
 */
export const accountService = {
  // Get account list with pagination
  async getList(limit = 20, skip = 0) {
    try {
      const result = await rpc("GetAddressList", { Limit: limit, Skip: skip });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to get account list:", error.message);
      return { result: [], totalCount: 0 };
    }
  },

  // Get account by address
  async getByAddress(address) {
    return safeRpc("GetAddressByAddress", { Address: address }, null);
  },

  // Get account assets (includes balance info)
  async getAssets(address) {
    return safeRpc("GetAssetsHeldByAddress", { Address: address }, []);
  },

  // Get account balance (alias for getAssets)
  async getBalance(address) {
    return safeRpc("GetAssetsHeldByAddress", { Address: address }, []);
  },
};

export default accountService;
