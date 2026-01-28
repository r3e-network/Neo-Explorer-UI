import { rpc, safeRpc, formatListResponse } from "./api";

/**
 * Block Service - All block-related API calls
 */
export const blockService = {
  // Get total block count
  async getCount() {
    return safeRpc("GetBlockCount", {}, 0);
  },

  // Get best block hash
  async getBestHash() {
    return safeRpc("GetBestBlockHash", {}, null);
  },

  // Get block list with pagination
  async getList(limit = 20, skip = 0) {
    try {
      const result = await rpc("GetBlockInfoList", { Limit: limit, Skip: skip });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to get block list:", error.message);
      return { result: [], totalCount: 0 };
    }
  },

  // Get block by hash
  async getByHash(hash) {
    return safeRpc("GetBlockByBlockHash", { BlockHash: hash }, null);
  },

  // Get block by height
  async getByHeight(height) {
    return safeRpc("GetBlockByBlockHeight", { BlockHeight: height }, null);
  },

  // Get block info by hash
  async getInfoByHash(hash) {
    return safeRpc("GetBlockInfoByBlockHash", { BlockHash: hash }, null);
  },

  // Get block header by hash
  async getHeaderByHash(hash) {
    return safeRpc("GetBlockHeaderByBlockHash", { BlockHash: hash }, null);
  },

  // Get block header by height
  async getHeaderByHeight(height) {
    return safeRpc("GetBlockHeaderByBlockHeight", { BlockHeight: height }, null);
  },
};

export default blockService;
