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
    it("uses standard getcandidates first (#186)", async () => {
      api.safeRpc.mockResolvedValueOnce([{ publickey: "01" }, { publickey: "02" }]);
      const result = await candidateService.getCount();
      expect(api.safeRpc).toHaveBeenCalledWith("getcandidates", [], [], expect.any(Object));
      // Legacy GetCandidateCount must not fire on the happy path.
      expect(api.safeRpc).not.toHaveBeenCalledWith("GetCandidateCount", expect.any(Object), expect.any(Number), expect.any(Object));
      expect(result).toEqual({ "total counts": 2 });
    });

    it("falls back to legacy GetCandidateCount when chain node returns null", async () => {
      api.safeRpc
        .mockResolvedValueOnce(null) // getcandidates returns nothing
        .mockResolvedValueOnce({ "total counts": 5 }); // legacy
      const result = await candidateService.getCount();
      expect(result).toEqual({ "total counts": 5 });
    });
  });

  describe("getList", () => {
    it("uses standard getcandidates first; legacy GetCandidate must not fire (#186)", async () => {
      api.safeRpc.mockResolvedValueOnce([
        { publickey: "01", votes: "100", active: true },
        { publickey: "02", votes: "50", active: false },
      ]);

      const result = await candidateService.getList(20, 0);

      expect(api.safeRpc).toHaveBeenCalledWith("getcandidates", [], [], expect.any(Object));
      expect(api.safeRpcList).not.toHaveBeenCalledWith(
        "GetCandidate",
        expect.any(Object),
        expect.any(String),
        expect.any(Object),
      );
      expect(result.totalCount).toBe(2);
      expect(result.result).toHaveLength(2);
    });

    it("paginates the standard getcandidates result", async () => {
      const rows = Array.from({ length: 50 }, (_, i) => ({
        publickey: `pk${i}`,
        votes: String(i),
        active: false,
      }));
      api.safeRpc.mockResolvedValueOnce(rows);

      const page = await candidateService.getList(20, 20);
      expect(page.result).toHaveLength(20);
      expect(page.totalCount).toBe(50);
    });
  });

  const PK1 = "020a135910609c72930b9ed4701b396065346aeb96b54f920827d8efe61f2ec855";
  const PK2 = "02237309a0633ff930d51856db01d17c829a5b2e5cc2638e9c03b4cfa8e9c9f971";

  describe("getByAddress", () => {
    it("derives candidate status + votes from node getcandidates (#186)", async () => {
      api.safeRpc.mockResolvedValueOnce([
        { publickey: PK1, votes: "944344", active: true },
        { publickey: PK2, votes: "5", active: false },
      ]);

      const result = await candidateService.getByAddress(PK1);
      expect(api.safeRpc).toHaveBeenCalledWith("getcandidates", [], null, expect.any(Object));
      // Legacy GetCandidateByAddress must not fire on the happy path.
      expect(api.safeRpc).not.toHaveBeenCalledWith(
        "GetCandidateByAddress",
        expect.any(Object),
        null,
        expect.any(Object),
      );
      expect(result).toMatchObject({
        candidatePubKey: PK1,
        votes: "944344",
        votesOfCandidate: "944344",
        active: true,
        isCommittee: true,
      });
    });

    it("returns null for a valid address that is not a candidate", async () => {
      api.safeRpc.mockResolvedValueOnce([{ publickey: PK1, votes: "1", active: false }]);
      const result = await candidateService.getByAddress(PK2);
      expect(result).toBeNull();
    });

    it("falls back to legacy GetCandidateByAddress when the node is unreachable", async () => {
      const legacy = { candidate: "0xabc", candidatePubKey: PK1 };
      api.safeRpc
        .mockResolvedValueOnce(null) // getcandidates unreachable
        .mockResolvedValueOnce(legacy); // legacy _getByAddressRpc
      const result = await candidateService.getByAddress("NAddr1");
      expect(result).toEqual(legacy);
    });
  });

  describe("getVotesByAddress", () => {
    it("returns the candidate's vote total from node getcandidates", async () => {
      api.safeRpc.mockResolvedValueOnce([{ publickey: PK1, votes: "500000", active: false }]);

      const result = await candidateService.getVotesByAddress(PK1);
      expect(api.safeRpc).toHaveBeenCalledWith("getcandidates", [], null, expect.any(Object));
      expect(result).toBe("500000");
    });

    it("returns 0 for a non-candidate address", async () => {
      api.safeRpc.mockResolvedValueOnce([{ publickey: PK1, votes: "1", active: false }]);
      const result = await candidateService.getVotesByAddress(PK2);
      expect(result).toBe(0);
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
      api.safeRpc.mockResolvedValueOnce([{ publickey: "01" }, { publickey: "02" }]);

      const first = await candidateService.getCount();
      const second = await candidateService.getCount();

      expect(first).toEqual({ "total counts": 2 });
      expect(second).toEqual({ "total counts": 2 });
      expect(api.safeRpc).toHaveBeenCalledTimes(1);
    });

    it("returns cached result on second call for getByAddress with same address", async () => {
      api.safeRpc.mockResolvedValueOnce([{ publickey: PK1, votes: "100", active: true }]);

      const first = await candidateService.getByAddress(PK1);
      const second = await candidateService.getByAddress(PK1);

      expect(first).toMatchObject({ candidatePubKey: PK1, votes: "100" });
      expect(second).toMatchObject({ candidatePubKey: PK1, votes: "100" });
      expect(api.safeRpc).toHaveBeenCalledTimes(1);
    });

    it("shares the cached getcandidates set across different addresses", async () => {
      api.safeRpc.mockResolvedValueOnce([
        { publickey: PK1, votes: "100", active: true },
        { publickey: PK2, votes: "50", active: false },
      ]);

      const a = await candidateService.getByAddress(PK1);
      const b = await candidateService.getByAddress(PK2);

      expect(a).toMatchObject({ votes: "100" });
      expect(b).toMatchObject({ votes: "50" });
      // Both derive from one shared, cached getcandidates round-trip.
      expect(api.safeRpc).toHaveBeenCalledTimes(1);
    });
  });
});
