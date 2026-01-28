import { safeRpc } from "./api";

/**
 * Search Service - Global search functionality
 */
export const searchService = {
  // Search by query (block, tx, address, contract)
  async search(query) {
    const results = { type: null, data: null };

    try {
      // Check if it's a block height (number)
      if (/^\d+$/.test(query)) {
        const block = await safeRpc("GetBlockByBlockHeight", {
          BlockHeight: parseInt(query),
        }, null);
        if (block) {
          results.type = "block";
          results.data = block;
          return results;
        }
      }

      // Check if it's a hash (64 chars hex)
      if (/^(0x)?[a-fA-F0-9]{64}$/.test(query)) {
        const hash = query.startsWith("0x") ? query : `0x${query}`;

        // Try block
        const block = await safeRpc("GetBlockByBlockHash", { BlockHash: hash }, null);
        if (block) {
          results.type = "block";
          results.data = block;
          return results;
        }

        // Try transaction
        const tx = await safeRpc("GetRawTransactionByTransactionHash", { TransactionHash: hash }, null);
        if (tx) {
          results.type = "transaction";
          results.data = tx;
          return results;
        }

        // Try contract
        const contract = await safeRpc("GetContractByContractHash", { ContractHash: hash }, null);
        if (contract) {
          results.type = "contract";
          results.data = contract;
          return results;
        }
      }

      // Check if it's an address (N...)
      if (/^N[A-Za-z0-9]{33}$/.test(query)) {
        const account = await safeRpc("GetAddressByAddress", { Address: query }, null);
        if (account) {
          results.type = "address";
          results.data = account;
          return results;
        }
      }
    } catch (error) {
      console.error("Search error:", error.message);
    }

    return results;
  },
};

export default searchService;
