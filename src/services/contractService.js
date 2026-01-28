import { rpc } from "./api";

/**
 * Contract Service - All contract-related API calls
 */
export const contractService = {
  // Get total contract count
  async getCount() {
    return rpc("GetContractCount");
  },

  // Get contract list with pagination
  async getList(limit = 20, skip = 0) {
    return rpc("GetContractList", { Limit: limit, Skip: skip });
  },

  // Get contract by hash
  async getByHash(hash) {
    return rpc("GetContractByContractHash", { ContractHash: hash });
  },

  // Search contracts by name
  async searchByName(name, limit = 20, skip = 0) {
    return rpc("GetContractListByName", {
      Name: name,
      Limit: limit,
      Skip: skip,
    });
  },
};

export default contractService;
