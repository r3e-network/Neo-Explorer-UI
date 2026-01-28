import { rpc } from './api'

/**
 * Stats Service - Dashboard statistics
 */
export const statsService = {
  // Get all dashboard stats
  async getDashboardStats() {
    const [blocks, txs, contracts, candidates] = await Promise.all([
      rpc('GetBlockCount'),
      rpc('GetTransactionCount'),
      rpc('GetContractCount'),
      rpc('GetCandidateCount')
    ])
    return { blocks, txs, contracts, candidates }
  }
}

export default statsService
