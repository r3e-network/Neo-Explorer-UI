import { rpc, safeRpc, formatListResponse } from "./api";

/**
 * Contract Service - All contract-related API calls
 */
export const contractService = {
  // Get total contract count
  async getCount() {
    return safeRpc("GetContractCount", {}, 0);
  },

  // Get contract list with pagination
  async getList(limit = 20, skip = 0) {
    try {
      const result = await rpc("GetContractList", { Limit: limit, Skip: skip });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to get contract list:", error.message);
      return { result: [], totalCount: 0 };
    }
  },

  // Get contract by hash
  async getByHash(hash) {
    return safeRpc("GetContractByContractHash", { ContractHash: hash }, null);
  },

  // Search contracts by name
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

  // Get verified contract source code
  async getVerifiedByHash(hash, updateCounter = 0) {
    return safeRpc("GetVerifiedContractByContractHash", {
      ContractHash: hash,
      UpdateCounter: updateCounter,
    }, null);
  },

  // Get list of verified contracts
  async getVerifiedList(limit = 20, skip = 0) {
    try {
      const result = await rpc("GetVerifiedContracts", { Limit: limit, Skip: skip });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to get verified contracts:", error.message);
      return { result: [], totalCount: 0 };
    }
  },
};

export default contractService;
