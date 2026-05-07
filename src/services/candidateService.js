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
        // Standard `getcandidates` is the canonical chain source — works
        // against any Neo node. The legacy GetCandidateCount RPC queried
        // a Mongo collection that's no longer populated (verified live
        // on /candidates). Same flip pattern as #178/#181/#182.
        const rows = await safeRpc("getcandidates", [], [], options);
        if (Array.isArray(rows)) {
          return { "total counts": rows.length };
        }
        // Fallback to the legacy Mongo wrapper only if the chain node
        // is unreachable (extremely rare).
        const rpcResult = await this._getCountRpc(options).catch(() => null);
        return rpcResult || { "total counts": 0 };
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
        // Standard `getcandidates` first — see getCount comment.
        const nativeRows = await safeRpc("getcandidates", [], [], options);
        if (Array.isArray(nativeRows) && nativeRows.length > 0) {
          const mapped = mapRpcCandidatesToCandidateRows(nativeRows);
          const safeSkip = Math.max(0, Number(skip) || 0);
          const safeLimit = Math.max(1, Number(limit) || 20);
          return {
            result: mapped.slice(safeSkip, safeSkip + safeLimit),
            totalCount: mapped.length,
          };
        }
        // Fallback to the legacy Mongo wrapper only if the chain node
        // is unreachable.
        const rpcResult = await this._getListRpc(limit, skip, options).catch(() => null);
        return rpcResult || { result: [], totalCount: 0 };
      },
      CACHE_TTL.chart,
      options,
    );
  },
});

export default candidateService;
