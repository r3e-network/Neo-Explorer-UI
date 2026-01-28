import { rpc } from './api'

/**
 * Token Service - All token-related API calls
 */
export const tokenService = {
  // Get NEP17 token list
  async getNep17List(limit = 20, skip = 0) {
    return rpc('GetNep17TokenList', { Limit: limit, Skip: skip })
  },

  // Get NEP11 (NFT) token list
  async getNep11List(limit = 20, skip = 0) {
    return rpc('GetNep11TokenList', { Limit: limit, Skip: skip })
  },

  // Get token by hash
  async getByHash(hash) {
    return rpc('GetContractByContractHash', { ContractHash: hash })
  },

  // Get token holders
  async getHolders(hash, limit = 20, skip = 0) {
    return rpc('GetNep17Holders', { 
      ContractHash: hash, 
      Limit: limit, 
      Skip: skip 
    })
  }
}

export default tokenService
