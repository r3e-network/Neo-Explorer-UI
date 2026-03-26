import { describe, it, expect, vi, beforeEach } from "vitest";
import { candidateService } from "../../src/services/candidateService.js";
import * as api from "../../src/services/api.js";
import { clearAllCache } from "../../src/services/cache.js";

vi.mock("../../src/services/api.js", () => ({
  rpc: vi.fn(),
  safeRpc: vi.fn(),
  safeRpcList: vi.fn(),
  formatListResponse: vi.fn((r) => r),
}));

describe("candidateService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
    clearAllCache();
  });

  describe("getCount", () => {
    it("calls safeRpc with GetCandidateCount and empty params", async () => {
      api.safeRpc.mockResolvedValueOnce(21);
      const result = await candidateService.getCount();
      expect(api.safeRpc).toHaveBeenCalledWith("GetCandidateCount", {}, 0, expect.any(Object));
      expect(result).toBe(21);
    });

    it("returns fallback 0 when rpc resolves with fallback", async () => {
      api.safeRpc
        .mockResolvedValueOnce(0) // GetCandidateCount
        .mockResolvedValueOnce([]); // getcandidates
      const result = await candidateService.getCount();
      expect(result).toEqual({ "total counts": 0 });
    });
  });

  describe("getList", () => {
    it("calls safeRpcList with default pagination", async () => {
      const mockData = { result: [{ address: "NAddr1" }], totalCount: 1 };
      api.safeRpcList.mockResolvedValueOnce(mockData);

      const result = await candidateService.getList();
      expect(api.safeRpcList).toHaveBeenCalledWith(
        "GetCandidate",
        { Limit: 20, Skip: 0 },
        "get candidate list",
        expect.any(Object),
      );
      expect(result).toEqual(mockData);
    });

    it("calls safeRpcList with custom pagination", async () => {
      const mockData = { result: [], totalCount: 0 };
      api.safeRpcList.mockResolvedValueOnce(mockData);

      await candidateService.getList(50, 10);
      expect(api.safeRpcList).toHaveBeenCalledWith(
        "GetCandidate",
        { Limit: 50, Skip: 10 },
        "get candidate list",
        expect.any(Object),
      );
    });
  });

  describe("getByAddress", () => {
    it("calls safeRpc with the given address", async () => {
      const candidate = { address: "NAddr1", votes: "100" };
      api.safeRpc.mockResolvedValueOnce(candidate);

      const result = await candidateService.getByAddress("NAddr1");
      expect(api.safeRpc).toHaveBeenCalledWith(
        "GetCandidateByAddress",
        { Address: "NAddr1" },
        null,
        expect.any(Object),
      );
      expect(result).toEqual(candidate);
    });

    it("returns null fallback for unknown address", async () => {
      api.safeRpc.mockResolvedValueOnce(null);
      const result = await candidateService.getByAddress("NUnknown");
      expect(result).toBeNull();
    });
  });

  describe("getVotesByAddress", () => {
    it("calls safeRpc with CandidateAddress param", async () => {
      api.safeRpc.mockResolvedValueOnce(500000);

      const result = await candidateService.getVotesByAddress("NAddr1");
      expect(api.safeRpc).toHaveBeenCalledWith(
        "GetVotesByCandidateAddress",
        { CandidateAddress: "NAddr1" },
        0,
        expect.any(Object),
      );
      expect(result).toBe(500000);
    });
  });

  describe("getVotersByAddress", () => {
    it("calls safeRpcList with address and default pagination", async () => {
      const mockData = { result: [{ voter: "NVoter1" }], totalCount: 1 };
      api.safeRpcList.mockResolvedValueOnce(mockData);

      const result = await candidateService.getVotersByAddress("NAddr1");
      expect(api.safeRpcList).toHaveBeenCalledWith(
        "GetVotersByCandidateAddress",
        { CandidateAddress: "NAddr1", Limit: 20, Skip: 0 },
        "get voters",
        expect.any(Object),
      );
      expect(result).toEqual(mockData);
    });

    it("calls safeRpcList with custom pagination", async () => {
      const mockData = { result: [], totalCount: 0 };
      api.safeRpcList.mockResolvedValueOnce(mockData);

      await candidateService.getVotersByAddress("NAddr1", 50, 10);
      expect(api.safeRpcList).toHaveBeenCalledWith(
        "GetVotersByCandidateAddress",
        { CandidateAddress: "NAddr1", Limit: 50, Skip: 10 },
        "get voters",
        expect.any(Object),
      );
    });
  });

  describe("caching", () => {
    it("returns cached result on second call for getCount", async () => {
      api.safeRpc.mockResolvedValueOnce(21);

      const first = await candidateService.getCount();
      const second = await candidateService.getCount();

      expect(first).toBe(21);
      expect(second).toBe(21);
      expect(api.safeRpc).toHaveBeenCalledTimes(1);
    });

    it("returns cached result on second call for getByAddress with same address", async () => {
      api.safeRpc.mockResolvedValueOnce({ address: "NAddr1" });

      const first = await candidateService.getByAddress("NAddr1");
      const second = await candidateService.getByAddress("NAddr1");

      expect(first).toEqual({ address: "NAddr1" });
      expect(second).toEqual({ address: "NAddr1" });
      expect(api.safeRpc).toHaveBeenCalledTimes(1);
    });

    it("does not use cache for different addresses", async () => {
      api.safeRpc.mockResolvedValueOnce({ address: "NAddr1" });
      api.safeRpc.mockResolvedValueOnce({ address: "NAddr2" });

      await candidateService.getByAddress("NAddr1");
      await candidateService.getByAddress("NAddr2");

      expect(api.safeRpc).toHaveBeenCalledTimes(2);
    });
  });
});
