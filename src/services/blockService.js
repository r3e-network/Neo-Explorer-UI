import { rpc } from "./api";

/**
 * Block Service - All block-related API calls
 */
export const blockService = {
  // Get total block count
  async getCount() {
    return rpc("GetBlockCount");
  },

  // Get best block hash
  async getBestHash() {
    return rpc("GetBestBlockHash");
  },

  // Get block list with pagination
  async getList(limit = 20, skip = 0) {
    return rpc("GetBlockInfoList", { Limit: limit, Skip: skip });
  },

  // Get block by hash
  async getByHash(hash) {
    return rpc("GetBlockByBlockHash", { BlockHash: hash });
  },

  // Get block by height
  async getByHeight(height) {
    return rpc("GetBlockByBlockHeight", { BlockHeight: height });
  },

  // Get block info by hash
  async getInfoByHash(hash) {
    return rpc("GetBlockInfoByBlockHash", { BlockHash: hash });
  },

  // Get block header by hash
  async getHeaderByHash(hash) {
    return rpc("GetBlockHeaderByBlockHash", { BlockHash: hash });
  },

  // Get block header by height
  async getHeaderByHeight(height) {
    return rpc("GetBlockHeaderByBlockHeight", { BlockHeight: height });
  },
};

export default blockService;
