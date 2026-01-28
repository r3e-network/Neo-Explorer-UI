import { rpc } from './api'

/**
 * Account Service - All account-related API calls
 */
export const accountService = {
  // Get account list with pagination
  async getList(limit = 20, skip = 0) {
    return rpc('GetAddressList', { Limit: limit, Skip: skip })
  },

  // Get account by address
  async getByAddress(address) {
    return rpc('GetAddressByAddress', { Address: address })
  },

  // Get account balance
  async getBalance(address) {
    return rpc('GetBalanceByAddress', { Address: address })
  },

  // Get account assets
  async getAssets(address) {
    return rpc('GetAssetByAddress', { Address: address })
  }
}

export default accountService
