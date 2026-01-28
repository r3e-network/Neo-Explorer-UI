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

  // Search tokens by name (NEP17)
  async searchNep17ByName(name, limit = 20, skip = 0) {
    return rpc("GetAssetInfosByName", {
      Name: name,
      Limit: limit,
      Skip: skip,
      Standard: "NEP17",
    });
  },

  // Search tokens by name (NEP11)
  async searchNep11ByName(name, limit = 20, skip = 0) {
    return rpc("GetAssetInfosByName", {
      Name: name,
      Limit: limit,
      Skip: skip,
      Standard: "NEP11",
    });
  },

  // Get NEP17 transfers by contract hash
  async getNep17Transfers(hash, limit = 20, skip = 0) {
    return rpc("GetNep17TransferByContractHash", {
      ContractHash: hash,
      Limit: limit,
      Skip: skip,
    });
  },

  // Get NEP11 transfers by contract hash
  async getNep11Transfers(hash, limit = 20, skip = 0) {
    return rpc("GetNep11TransferByContractHash", {
      ContractHash: hash,
      Limit: limit,
      Skip: skip,
    });
  },

  // Get NEP11 transfers by contract hash and token ID
  async getNep11TransfersByTokenId(hash, tokenId, limit = 20, skip = 0) {
    return rpc("GetNep11TransferByContractHashTokenId", {
      ContractHash: hash,
      tokenId: tokenId,
      Limit: limit,
      Skip: skip,
    });
  },
};

export default tokenService;
