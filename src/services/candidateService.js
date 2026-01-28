import { rpc, safeRpc, formatListResponse } from "./api";

/**
 * Candidate Service - Neo3 候选人/验证人相关 API
 * @module services/candidateService
 * @description 通过 neo3fura 获取共识节点候选人数据
 */
export const candidateService = {
  /**
   * 获取候选人总数
   * @returns {Promise<number>} 候选人数量
   */
  async getCount() {
    return safeRpc("GetCandidateCount", {}, 0);
  },

  /**
   * 获取候选人列表（分页）
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 候选人列表
   */
  async getList(limit = 20, skip = 0) {
    try {
      const result = await rpc("GetCandidate", { Limit: limit, Skip: skip });
      return formatListResponse(result);
    } catch (error) {
      console.error("Failed to get candidate list:", error.message);
      return { result: [], totalCount: 0 };
    }
  },

  /**
   * 根据地址获取候选人信息
   * @param {string} address - 候选人地址
   * @returns {Promise<Object|null>} 候选人数据
   */
  async getByAddress(address) {
    return safeRpc("GetCandidateByAddress", { Address: address }, null);
  },

  /**
   * 获取候选人得票数
   * @param {string} address - 候选人地址
   * @returns {Promise<number>} 得票数
   */
  async getVotesByAddress(address) {
    return safeRpc(
      "GetVotesByCandidateAddress",
      { CandidateAddress: address },
      0
    );
  },

  /**
   * 获取候选人的投票者列表
   * @param {string} address - 候选人地址
   * @param {number} [limit=20] - 每页数量
   * @param {number} [skip=0] - 跳过数量
   * @returns {Promise<{result: Array, totalCount: number}>} 投票者列表
   */
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
