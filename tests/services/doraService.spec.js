import { getCommittee, getLiveness } from "@/services/doraService";

const { cachedRequestMock, getDoraCommitteeUrlMock, getDoraCommitteeCacheKeyMock, getCurrentEnvMock } = vi.hoisted(() => ({
  cachedRequestMock: vi.fn(),
  getDoraCommitteeUrlMock: vi.fn(),
  getDoraCommitteeCacheKeyMock: vi.fn(),
  getCurrentEnvMock: vi.fn(),
}));

vi.mock("@/services/cache", () => ({ cachedRequest: cachedRequestMock }));
vi.mock("@/utils/dora", () => ({
  getDoraCommitteeUrl: getDoraCommitteeUrlMock,
  getDoraCommitteeCacheKey: getDoraCommitteeCacheKeyMock,
}));
vi.mock("@/utils/env", async () => {
  const actual = await vi.importActual("@/utils/env");
  return {
    ...actual,
    getCurrentEnv: getCurrentEnvMock,
    NET_ENV: { Mainnet: "mainnet", TestT5: "testT5" },
  };
});

describe("doraService", () => {
  beforeEach(() => {
    cachedRequestMock.mockReset();
    getDoraCommitteeUrlMock.mockReset();
    getDoraCommitteeCacheKeyMock.mockReset();
    getCurrentEnvMock.mockReset();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  describe("getCommittee", () => {
    it("returns [] without hitting network when env is testnet", async () => {
      const result = await getCommittee("testnet");
      expect(result).toEqual([]);
      expect(cachedRequestMock).not.toHaveBeenCalled();
    });

    it("returns [] when env contains 'test' (substring match for testT5)", async () => {
      const result = await getCommittee("testT5");
      expect(result).toEqual([]);
      expect(cachedRequestMock).not.toHaveBeenCalled();
    });

    it("requests with cacheKey + url on mainnet", async () => {
      getDoraCommitteeUrlMock.mockReturnValue("https://dora.example.com/committee");
      getDoraCommitteeCacheKeyMock.mockReturnValue("dora_committee_mainnet");
      const expectedData = [{ pk: "abc", votes: 100 }];
      cachedRequestMock.mockResolvedValue(expectedData);

      const result = await getCommittee("mainnet");

      expect(getDoraCommitteeUrlMock).toHaveBeenCalledWith("mainnet");
      expect(getDoraCommitteeCacheKeyMock).toHaveBeenCalledWith("mainnet");
      expect(cachedRequestMock).toHaveBeenCalledWith(
        "dora_committee_mainnet",
        expect.any(Function),
        300_000,
      );
      expect(result).toEqual(expectedData);
    });

    it("defaults to NET_ENV.Mainnet when network not provided", async () => {
      getDoraCommitteeUrlMock.mockReturnValue("u");
      getDoraCommitteeCacheKeyMock.mockReturnValue("k");
      cachedRequestMock.mockResolvedValue([]);
      await getCommittee();
      expect(getDoraCommitteeUrlMock).toHaveBeenCalledWith("mainnet");
    });

    it("inner fetcher resolves to [] when fetch fails", async () => {
      getDoraCommitteeUrlMock.mockReturnValue("https://dora.example.com");
      getDoraCommitteeCacheKeyMock.mockReturnValue("k");
      let capturedFetcher;
      cachedRequestMock.mockImplementation((_key, fn) => {
        capturedFetcher = fn;
        return fn();
      });
      global.fetch.mockRejectedValue(new Error("net error"));
      const result = await getCommittee("mainnet");
      expect(result).toEqual([]);
      expect(typeof capturedFetcher).toBe("function");
    });

    it("inner fetcher returns [] when response is not ok", async () => {
      getDoraCommitteeUrlMock.mockReturnValue("u");
      getDoraCommitteeCacheKeyMock.mockReturnValue("k");
      cachedRequestMock.mockImplementation((_key, fn) => fn());
      global.fetch.mockResolvedValue({ ok: false, json: vi.fn() });
      const result = await getCommittee("mainnet");
      expect(result).toEqual([]);
    });

    it("inner fetcher passes through json when response is ok", async () => {
      getDoraCommitteeUrlMock.mockReturnValue("u");
      getDoraCommitteeCacheKeyMock.mockReturnValue("k");
      cachedRequestMock.mockImplementation((_key, fn) => fn());
      const data = [{ a: 1 }];
      global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });
      const result = await getCommittee("mainnet");
      expect(result).toEqual(data);
    });
  });

  describe("getLiveness", () => {
    it("returns map keyed by nodeIndex on success", async () => {
      cachedRequestMock.mockResolvedValue({
        success: true,
        liveness: [
          { nodeIndex: 0, alive: true },
          { nodeIndex: 1, alive: false },
        ],
      });
      const result = await getLiveness("mainnet");
      expect(result).toEqual({
        0: { nodeIndex: 0, alive: true },
        1: { nodeIndex: 1, alive: false },
      });
    });

    it("auto-detects env when not provided — mainnet branch", async () => {
      getCurrentEnvMock.mockReturnValue("mainnet");
      cachedRequestMock.mockResolvedValue({ success: true, liveness: [] });
      await getLiveness();
      expect(cachedRequestMock).toHaveBeenCalledWith(
        "dora_liveness_mainnet",
        expect.any(Function),
        300_000,
      );
    });

    it("auto-detects env when not provided — testnet branch", async () => {
      getCurrentEnvMock.mockReturnValue("test");
      cachedRequestMock.mockResolvedValue({ success: true, liveness: [] });
      await getLiveness();
      expect(cachedRequestMock).toHaveBeenCalledWith(
        "dora_liveness_testnet",
        expect.any(Function),
        300_000,
      );
    });

    it("returns {} when data has no success flag", async () => {
      cachedRequestMock.mockResolvedValue({ liveness: [{ nodeIndex: 0 }] });
      const result = await getLiveness("mainnet");
      expect(result).toEqual({});
    });

    it("returns {} when liveness is not an array", async () => {
      cachedRequestMock.mockResolvedValue({ success: true, liveness: "not-an-array" });
      const result = await getLiveness("mainnet");
      expect(result).toEqual({});
    });

    it("returns {} when cachedRequest rejects", async () => {
      cachedRequestMock.mockRejectedValue(new Error("boom"));
      const result = await getLiveness("mainnet");
      expect(result).toEqual({});
    });
  });
});
