import { rpc } from "./api";

/**
 * Token Service - All token-related API calls
 */
export const tokenService = {
  // Get NEP17 token list
  async getNep17List(limit = 20, skip = 0) {
    return rpc("GetAssetInfos", { Limit: limit, Skip: skip, Type: "NEP17" });
  },

  // Get NEP11 (NFT) token list
  async getNep11List(limit = 20, skip = 0) {
    return rpc("GetAssetInfos", { Limit: limit, Skip: skip, Type: "NEP11" });
  },

  // Get token by hash
  async getByHash(hash) {
    return rpc("GetAssetInfoByContractHash", { ContractHash: hash });
  },

  // Get token holders
  async getHolders(hash, limit = 20, skip = 0) {
    return rpc("GetAssetHoldersByContractHash", {
      ContractHash: hash,
      Limit: limit,
      Skip: skip,
    });
  },
};

export default tokenService;
