import { rpc } from './api'

/**
 * Search Service - Global search functionality
 */
export const searchService = {
  // Search by query (block, tx, address, contract)
  async search(query) {
    // Try different search methods
    const results = { type: null, data: null }
    
    // Check if it's a block height (number)
    if (/^\d+$/.test(query)) {
      const block = await rpc('GetBlockByBlockHeight', { BlockHeight: parseInt(query) })
      if (block) {
        results.type = 'block'
        results.data = block
        return results
      }
    }
    
    // Check if it's a hash (64 chars hex)
    if (/^(0x)?[a-fA-F0-9]{64}$/.test(query)) {
      const hash = query.startsWith('0x') ? query : `0x${query}`
      
      // Try block
      const block = await rpc('GetBlockByBlockHash', { BlockHash: hash })
      if (block) {
        results.type = 'block'
        results.data = block
        return results
      }
      
      // Try transaction
      const tx = await rpc('GetRawTransactionByTxHash', { TxHash: hash })
      if (tx) {
        results.type = 'transaction'
        results.data = tx
        return results
      }
      
      // Try contract
      const contract = await rpc('GetContractByContractHash', { ContractHash: hash })
      if (contract) {
        results.type = 'contract'
        results.data = contract
        return results
      }
    }
    
    // Check if it's an address (N...)
    if (/^N[A-Za-z0-9]{33}$/.test(query)) {
      const account = await rpc('GetAddressByAddress', { Address: query })
      if (account) {
        results.type = 'address'
        results.data = account
        return results
      }
    }
    
    return results
  }
}

export default searchService
