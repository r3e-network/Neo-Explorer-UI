import axios from "axios";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { createService } from "./serviceFactory";

/**
 * Contract Service - Neo3 合约相关 API 调用
 * @module services/contractService
 * @description 通过 neo3fura 后端获取智能合约数据
 */

export const contractService = createService(
  {
    getCount: {
      cacheKey: "contract_count",
      rpcMethod: "GetContractCount",
      fallback: 0,
      ttl: CACHE_TTL.stats,
      realtime: true,
      buildParams: () => ({}),
    },
    getList: {
      _type: "list",
      cacheKey: "contract_list",
      rpcMethod: "GetContractList",
      errorLabel: "get contract list",
      ttl: CACHE_TTL.contract,
      buildParams: ([limit = 20, skip = 0]) => ({ Limit: limit, Skip: skip }),
      buildCacheParams: ([limit = 20, skip = 0]) => ({ limit, skip }),
    },
    getByHash: {
      cacheKey: "contract_hash",
      rpcMethod: "GetContractByContractHash",
      fallback: null,
      ttl: CACHE_TTL.contract,
      buildParams: ([hash]) => ({ ContractHash: hash }),
      buildCacheParams: ([hash]) => ({ hash }),
    },
    searchByName: {
      _type: "list",
      cacheKey: "contract_search",
      rpcMethod: "GetContractListByName",
      errorLabel: "search contracts",
      ttl: CACHE_TTL.contract,
      buildParams: ([name, limit = 20, skip = 0]) => ({ Name: name, Limit: limit, Skip: skip }),
      buildCacheParams: ([name, limit = 20, skip = 0]) => ({ name, limit, skip }),
    },
    getVerifiedByHash: {
      cacheKey: "contract_verified",
      rpcMethod: "GetVerifiedContractByContractHash",
      fallback: null,
      ttl: CACHE_TTL.contract,
      buildParams: ([hash, updateCounter = 0]) => ({ ContractHash: hash, UpdateCounter: updateCounter }),
      buildCacheParams: ([hash, updateCounter = 0]) => ({ hash, updateCounter }),
    },
    getVerifiedList: {
      _type: "list",
      cacheKey: "contract_verified_list",
      rpcMethod: "GetVerifiedContracts",
      errorLabel: "get verified contracts",
      ttl: CACHE_TTL.contract,
      buildParams: ([limit = 20, skip = 0]) => ({ Limit: limit, Skip: skip }),
      buildCacheParams: ([limit = 20, skip = 0]) => ({ limit, skip }),
    },
    getScCalls: {
      _type: "list",
      cacheKey: "contract_sc_calls",
      rpcMethod: "GetScCallByContractHash",
      errorLabel: "get SC calls",
      ttl: CACHE_TTL.chart,
      buildParams: ([hash, limit = 20, skip = 0]) => ({ ContractHash: hash, Limit: limit, Skip: skip }),
      buildCacheParams: ([hash, limit = 20, skip = 0]) => ({ hash, limit, skip }),
    },
    getNotifications: {
      _type: "list",
      cacheKey: "contract_notifications",
      rpcMethod: "GetNotificationByContractHash",
      errorLabel: "get contract notifications",
      ttl: CACHE_TTL.chart,
      buildParams: ([hash, limit = 20, skip = 0]) => ({ ContractHash: hash, Limit: limit, Skip: skip }),
      buildCacheParams: ([hash, limit = 20, skip = 0]) => ({ hash, limit, skip }),
    },
    invokeRead: {
      cacheKey: "contract_invoke_read",
      rpcMethod: "InvokeFunction",
      fallback: null,
      ttl: CACHE_TTL.contract,
      buildParams: ([hash, method, params = []]) => ({ ContractHash: hash, Operation: method, Args: params }),
      buildCacheParams: ([hash, method, params = []]) => ({ hash, method, params }),
    },
  },
  {
    /**
     * 获取合约 manifest（带缓存，极少变更）
     * Calls getByHash internally — cannot be expressed as a single RPC config.
     * @param {string} hash - 合约哈希
     * @returns {Promise<Object|null>} manifest 数据
     */
    async getManifest(hash, options = {}) {
      const key = getCacheKey("contract_manifest", { hash });
      return cachedRequest(
        key,
        async () => {
          const contract = await contractService.getByHash(hash, options);
          return contract?.manifest ?? null;
        },
        CACHE_TTL.contract,
        options
      );
    },

    /**
     * 上传合约源码进行验证
     * Uses axios POST to an external node — not an RPC call.
     * @param {string} nodeUrl - 验证节点 URL
     * @param {FormData} formData - 包含源码文件和合约信息的 FormData
     * @returns {Promise<Object>} 验证结果
     */
    async uploadVerification(nodeUrl, formData) {
      try {
        const { data } = await axios.post(nodeUrl, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return data;
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("[contractService] uploadVerification failed:", err);
        }
        throw err;
      }
    },
  }
);

export default contractService;
