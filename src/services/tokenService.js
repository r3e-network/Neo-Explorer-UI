import { rpc, safeRpc, formatListResponse } from "./api";

/**
 * Token Service - All token-related API calls
 */
export const tokenService = {
  // Get NEP17 token list
  async getNep17List(limit = 20, skip = 0) {
    try {
      const result = await rpc("GetAssetInfos", { Limit: limit, Skip: skip, Type: "NEP17" });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to get NEP17 list:", error.message);
      return { result: [], totalCount: 0 };
    }
  },

  // Get NEP11 (NFT) token list
  async getNep11List(limit = 20, skip = 0) {
    try {
      const result = await rpc("GetAssetInfos", { Limit: limit, Skip: skip, Type: "NEP11" });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to get NEP11 list:", error.message);
      return { result: [], totalCount: 0 };
    }
  },

  // Get token by hash
  async getByHash(hash) {
    return safeRpc("GetAssetInfoByContractHash", { ContractHash: hash }, null);
  },

  // Get token holders
  async getHolders(hash, limit = 20, skip = 0) {
    try {
      const result = await rpc("GetAssetHoldersByContractHash", {
        ContractHash: hash,
        Limit: limit,
        Skip: skip,
      });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to get token holders:", error.message);
      return { result: [], totalCount: 0 };
    }
  },

  // Search tokens by name (NEP17)
  async searchNep17ByName(name, limit = 20, skip = 0) {
    try {
      const result = await rpc("GetAssetInfosByName", {
        Name: name,
        Limit: limit,
        Skip: skip,
        Standard: "NEP17",
      });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to search NEP17:", error.message);
      return { result: [], totalCount: 0 };
    }
  },

  // Search tokens by name (NEP11)
  async searchNep11ByName(name, limit = 20, skip = 0) {
    try {
      const result = await rpc("GetAssetInfosByName", {
        Name: name,
        Limit: limit,
        Skip: skip,
        Standard: "NEP11",
      });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to search NEP11:", error.message);
      return { result: [], totalCount: 0 };
    }
  },

  // Get NEP17 transfers by contract hash
  async getNep17Transfers(hash, limit = 20, skip = 0) {
    try {
      const result = await rpc("GetNep17TransferByContractHash", {
        ContractHash: hash,
        Limit: limit,
        Skip: skip,
      });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to get NEP17 transfers:", error.message);
      return { result: [], totalCount: 0 };
    }
  },

  // Get NEP11 transfers by contract hash
  async getNep11Transfers(hash, limit = 20, skip = 0) {
    try {
      const result = await rpc("GetNep11TransferByContractHash", {
        ContractHash: hash,
        Limit: limit,
        Skip: skip,
      });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to get NEP11 transfers:", error.message);
      return { result: [], totalCount: 0 };
    }
  },

  // Get NEP11 transfers by contract hash and token ID
  async getNep11TransfersByTokenId(hash, tokenId, limit = 20, skip = 0) {
    try {
      const result = await rpc("GetNep11TransferByContractHashTokenId", {
        ContractHash: hash,
        tokenId: tokenId,
        Limit: limit,
        Skip: skip,
      });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to get NEP11 transfers by token:", error.message);
      return { result: [], totalCount: 0 };
    }
  },
};

export default tokenService;
