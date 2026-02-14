import { CACHE_TTL } from "./cache";
import { createService } from "./serviceFactory";

/**
 * Account Service - Neo3 账户相关 API 调用
 * @module services/accountService
 * @description 通过 neo3fura 后端获取账户数据
 */

export const accountService = createService(
  {
    getCount: {
      cacheKey: "account_count",
      rpcMethod: "GetAddressCount",
      fallback: 0,
      ttl: CACHE_TTL.stats,
      realtime: true,
      buildParams: () => ({}),
    },
    getList: {
      _type: "list",
      cacheKey: "account_list",
      rpcMethod: "GetAddressList",
      errorLabel: "get account list",
      ttl: CACHE_TTL.chart,
      buildParams: ([limit = 20, skip = 0]) => ({ Limit: limit, Skip: skip }),
      buildCacheParams: ([limit = 20, skip = 0]) => ({ limit, skip }),
    },
    getByAddress: {
      cacheKey: "account_address",
      rpcMethod: "GetAddressByAddress",
      fallback: null,
      ttl: CACHE_TTL.address,
      realtime: true,
      buildParams: ([address]) => ({ Address: address }),
      buildCacheParams: ([address]) => ({ address }),
    },
    getAssets: {
      cacheKey: "addr_assets",
      rpcMethod: "GetAssetsHeldByAddress",
      fallback: [],
      ttl: CACHE_TTL.token,
      realtime: true,
      buildParams: ([address]) => ({ Address: address }),
      buildCacheParams: ([address]) => ({ address }),
    },
    getNep17Transfers: {
      _type: "list",
      cacheKey: "account_nep17_transfers",
      rpcMethod: "GetNep17TransferByAddress",
      errorLabel: "get NEP17 transfers by address",
      ttl: CACHE_TTL.chart,
      buildParams: ([address, limit = 20, skip = 0]) => ({ Address: address, Limit: limit, Skip: skip }),
      buildCacheParams: ([address, limit = 20, skip = 0]) => ({ address, limit, skip }),
    },
    getNep11Transfers: {
      _type: "list",
      cacheKey: "account_nep11_transfers",
      rpcMethod: "GetNep11TransferByAddress",
      errorLabel: "get NEP11 transfers by address",
      ttl: CACHE_TTL.chart,
      buildParams: ([address, limit = 20, skip = 0]) => ({ Address: address, Limit: limit, Skip: skip }),
      buildCacheParams: ([address, limit = 20, skip = 0]) => ({ address, limit, skip }),
    },
  },
  {
    /**
     * @deprecated Use getAssets instead — identical RPC call.
     */
    getTokenHoldings(address, options = {}) {
      return this.getAssets(address, options);
    },
  }
);

export default accountService;
