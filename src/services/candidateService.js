import { rpc } from "./api";

/**
 * Candidate Service - All candidate/validator-related API calls
 */
export const candidateService = {
  // Get candidate count
  async getCount() {
    return rpc("GetCandidateCount");
  },

  // Get candidate list
  async getList(limit = 20, skip = 0) {
    return rpc("GetCandidate", { Limit: limit, Skip: skip });
  },

  // Get candidate by address
  async getByAddress(address) {
    return rpc("GetCandidateByAddress", { Address: address });
  },

  // Get votes by candidate address
  async getVotesByAddress(address) {
    return rpc("GetVotesByCandidateAddress", { CandidateAddress: address });
  },

  // Get voters by candidate address
  async getVotersByAddress(address, limit = 20, skip = 0) {
    return rpc("GetVotersByCandidateAddress", {
      CandidateAddress: address,
      Limit: limit,
      Skip: skip,
    });
  },
};

export default candidateService;
