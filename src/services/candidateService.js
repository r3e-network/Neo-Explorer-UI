import { rpc, safeRpc, formatListResponse } from "./api";

/**
 * Candidate Service - All candidate/validator-related API calls
 */
export const candidateService = {
  // Get candidate count
  async getCount() {
    return safeRpc("GetCandidateCount", {}, 0);
  },

  // Get candidate list
  async getList(limit = 20, skip = 0) {
    try {
      const result = await rpc("GetCandidate", { Limit: limit, Skip: skip });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to get candidate list:", error.message);
      return { result: [], totalCount: 0 };
    }
  },

  // Get candidate by address
  async getByAddress(address) {
    return safeRpc("GetCandidateByAddress", { Address: address }, null);
  },

  // Get votes by candidate address
  async getVotesByAddress(address) {
    return safeRpc("GetVotesByCandidateAddress", { CandidateAddress: address }, 0);
  },

  // Get voters by candidate address
  async getVotersByAddress(address, limit = 20, skip = 0) {
    try {
      const result = await rpc("GetVotersByCandidateAddress", {
        CandidateAddress: address,
        Limit: limit,
        Skip: skip,
      });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to get voters:", error.message);
      return { result: [], totalCount: 0 };
    }
  },
};

export default candidateService;
