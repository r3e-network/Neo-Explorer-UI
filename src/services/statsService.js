import { rpc } from './api'

/**
 * Stats Service - Dashboard statistics
 */
export const statsService = {
  // Get all dashboard stats
  async getDashboardStats() {
    try {
      const [blocks, txs, contracts, candidates, addresses, tokens] = await Promise.all([
        rpc('GetBlockCount').catch(() => 0),
        rpc('GetTransactionCount').catch(() => 0),
        rpc('GetContractCount').catch(() => 0),
        rpc('GetCandidateCount').catch(() => 0),
        rpc('GetAddressCount').catch(() => 0),
        rpc('GetAssetCount').catch(() => 0)
      ])
      return { blocks, txs, contracts, candidates, addresses, tokens }
    } catch (error) {
      console.error('Failed to get dashboard stats:', error)
      return { blocks: 0, txs: 0, contracts: 0, candidates: 0, addresses: 0, tokens: 0 }
    }
  },

  // Get network activity for charts
  async getNetworkActivity(days = 14) {
    try {
      return await rpc('GetDailyTransactionCount', { Days: days })
    } catch (error) {
      console.error('Failed to get network activity:', error)
      return []
    }
  },

  // Get TPS (transactions per second)
  async getTPS() {
    try {
      return await rpc('GetTPS')
    } catch (error) {
      return 0
    }
  }
}

export default statsService
