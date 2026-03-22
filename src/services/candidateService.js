import { CACHE_TTL } from "./cache";
import { createService } from "./serviceFactory";

/**
 * Candidate Service - Neo3 候选人/验证人相关 API
 * @module services/candidateService
 * @description 通过 neo3fura 获取共识节点候选人数据
 */

export const candidateService = createService({
  getCount: {
    cacheKey: "candidate_count",
    rpcMethod: "GetCandidateCount",
    fallback: 0,
    ttl: CACHE_TTL.stats,
    realtime: true,
    buildParams: () => ({}),
  },
  getList: {
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
});

export default candidateService;
