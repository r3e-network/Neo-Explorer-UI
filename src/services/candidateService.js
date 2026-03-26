import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { createService } from "./serviceFactory";
import { safeRpc } from "./api";
import { mapRpcCandidatesToCandidateRows } from "./legacyFallbacks";

/**
 * Candidate Service - Neo3 候选人/验证人相关 API
 * @module services/candidateService
 * @description 通过 neo3fura 获取共识节点候选人数据
 */

export const candidateService = createService({
  _getCountRpc: {
    cacheKey: "candidate_count",
    rpcMethod: "GetCandidateCount",
    fallback: 0,
    ttl: CACHE_TTL.stats,
    realtime: true,
    buildParams: () => ({}),
  },
  _getListRpc: {
    _type: "list",
    cacheKey: "candidate_list",
    rpcMethod: "GetCandidate",
    errorLabel: "get candidate list",
    ttl: CACHE_TTL.chart,
    buildParams: ([limit = 20, skip = 0]) => ({ Limit: limit, Skip: skip }),
    buildCacheParams: ([limit = 20, skip = 0]) => ({ limit, skip }),
  },
  getByAddress: {
    cacheKey: "candidate_address",
    rpcMethod: "GetCandidateByAddress",
    fallback: null,
    ttl: CACHE_TTL.address,
    realtime: true,
    buildParams: ([address]) => ({ Address: address }),
    buildCacheParams: ([address]) => ({ address }),
  },
  getVotesByAddress: {
    cacheKey: "candidate_votes",
    rpcMethod: "GetVotesByCandidateAddress",
    fallback: 0,
    ttl: CACHE_TTL.stats,
    realtime: true,
    buildParams: ([address]) => ({ CandidateAddress: address }),
    buildCacheParams: ([address]) => ({ address }),
  },
  getVotersByAddress: {
    _type: "list",
    cacheKey: "candidate_voters",
    rpcMethod: "GetVotersByCandidateAddress",
    errorLabel: "get voters",
    ttl: CACHE_TTL.chart,
    buildParams: ([address, limit = 20, skip = 0]) => ({
      CandidateAddress: address,
      Limit: limit,
      Skip: skip,
    }),
    buildCacheParams: ([address, limit = 20, skip = 0]) => ({ address, limit, skip }),
  },
}, {
  async getCount(options = {}) {
    const key = getCacheKey("candidate_count_fallback", {});
    return cachedRequest(
      key,
      async () => {
        let rpcResult = null;
        try {
          rpcResult = await this._getCountRpc(options);
        } catch (_err) {
          rpcResult = null;
        }
        const directCount = Number(rpcResult?.["total counts"] ?? rpcResult?.count ?? rpcResult ?? 0);
        if (Number.isFinite(directCount) && directCount > 0) {
          return rpcResult;
        }

        const rows = await safeRpc("getcandidates", [], [], options);
        return { "total counts": Array.isArray(rows) ? rows.length : 0 };
      },
      CACHE_TTL.stats,
      options,
    );
  },

  async getList(limit = 20, skip = 0, options = {}) {
    const key = getCacheKey("candidate_list_fallback", { limit, skip });
    return cachedRequest(
      key,
      async () => {
        let rpcResult = null;
        try {
          rpcResult = await this._getListRpc(limit, skip, options);
        } catch (_err) {
          rpcResult = null;
        }
        const existingRows = Array.isArray(rpcResult?.result) ? rpcResult.result : [];
        if (existingRows.length > 0) {
          return rpcResult;
        }

        const nativeRows = await safeRpc("getcandidates", [], [], options);
        const mapped = mapRpcCandidatesToCandidateRows(nativeRows);
        const safeSkip = Math.max(0, Number(skip) || 0);
        const safeLimit = Math.max(1, Number(limit) || 20);
        return {
          result: mapped.slice(safeSkip, safeSkip + safeLimit),
          totalCount: mapped.length,
        };
      },
      CACHE_TTL.chart,
      options,
    );
  },
});

export default candidateService;
