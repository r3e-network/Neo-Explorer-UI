const { getCurrentEnvMock } = vi.hoisted(() => ({
  getCurrentEnvMock: vi.fn(),
}));

vi.mock("@/utils/env", () => ({
  getCurrentEnv: getCurrentEnvMock,
  NET_ENV: { Mainnet: "mainnet", TestT5: "testT5" },
}));

let getSeeds;
let getLatestBlocks;
let getNetworkHealth;

describe("networkMonitorService", () => {
  beforeEach(async () => {
    vi.resetModules();
    getCurrentEnvMock.mockReset().mockReturnValue("mainnet");
    global.fetch = vi.fn();
    const mod = await import("@/services/networkMonitorService");
    getSeeds = mod.getSeeds;
    getLatestBlocks = mod.getLatestBlocks;
    getNetworkHealth = mod.getNetworkHealth;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete global.fetch;
  });

  describe("getSeeds", () => {
    it("returns array on successful fetch and caches under N3main slug for mainnet", async () => {
      const data = [{ endpoint: "seed1.ngd.io", height: 100, version: "v3", latency: 50 }];
      global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });
      const result = await getSeeds("mainnet");
      expect(result).toEqual(data);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/N3main/seeds"),
        expect.any(Object),
      );
    });

    it("uses N3test slug for testnet env", async () => {
      global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
      await getSeeds("testnet");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/N3test/seeds"),
        expect.any(Object),
      );
    });

    it("falls back to current env when no env provided (testnet branch)", async () => {
      getCurrentEnvMock.mockReturnValue("testT5");
      global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
      await getSeeds();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/N3test/seeds"),
        expect.any(Object),
      );
    });

    it("returns [] when response is not ok", async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) });
      const result = await getSeeds("mainnet-error1");
      expect(result).toEqual([]);
    });

    it("returns [] when response data is not an array", async () => {
      global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ unexpected: "object" }) });
      const result = await getSeeds("mainnet-nonarr");
      expect(result).toEqual([]);
    });

    it("returns [] when fetch rejects", async () => {
      global.fetch.mockRejectedValue(new Error("offline"));
      const result = await getSeeds("mainnet-rej");
      expect(result).toEqual([]);
    });

    it("returns cached result on second call within TTL", async () => {
      const data = [{ endpoint: "x", height: 1 }];
      global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });
      await getSeeds("mainnet-cache1");
      await getSeeds("mainnet-cache1");
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("re-fetches after TTL expires", async () => {
      const data = [{ endpoint: "x" }];
      global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });
      await getSeeds("mainnet-cache2");
      // TTL is 30s; spy Date.now to fast-forward without affecting setTimeout
      const realNow = Date.now;
      vi.spyOn(Date, "now").mockReturnValue(realNow() + 31_000);
      await getSeeds("mainnet-cache2");
      expect(global.fetch).toHaveBeenCalledTimes(2);
      Date.now.mockRestore();
    });
  });

  describe("getLatestBlocks", () => {
    it("returns array on success and caches", async () => {
      const data = [{ height: 100, time: 1700000000, interval: 15, tx: 5 }];
      global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });
      const result = await getLatestBlocks("mainnet-latest1");
      expect(result).toEqual(data);
    });

    it("returns [] on fetch error", async () => {
      global.fetch.mockRejectedValue(new Error("network down"));
      const result = await getLatestBlocks("mainnet-latest-err");
      expect(result).toEqual([]);
    });

    it("returns [] when response is not an array", async () => {
      global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve("string-response") });
      const result = await getLatestBlocks("mainnet-latest-nonarr");
      expect(result).toEqual([]);
    });
  });

  describe("getNetworkHealth", () => {
    it("returns zeros when no seeds available", async () => {
      global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
      const health = await getNetworkHealth("mainnet-empty");
      expect(health).toEqual({ online: 0, total: 0, tip: 0, healthy: false });
    });

    it("counts all seeds online when within stale window of tip", async () => {
      const seeds = [
        { endpoint: "a", height: 100 },
        { endpoint: "b", height: 99 },
        { endpoint: "c", height: 100 },
      ];
      global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(seeds) });
      const health = await getNetworkHealth("mainnet-allhealthy");
      expect(health.online).toBe(3);
      expect(health.total).toBe(3);
      expect(health.tip).toBe(100);
      expect(health.healthy).toBe(true);
      expect(health.seeds).toEqual(seeds);
    });

    it("flags partial health when a seed lags beyond the stale window", async () => {
      const seeds = [
        { endpoint: "a", height: 100 },
        { endpoint: "b", height: 95 }, // 5 blocks behind, > default 2 window
      ];
      global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(seeds) });
      const health = await getNetworkHealth("mainnet-partial");
      expect(health.online).toBe(1);
      expect(health.total).toBe(2);
      expect(health.tip).toBe(100);
      expect(health.healthy).toBe(false);
    });

    it("respects custom staleHeightWindow", async () => {
      const seeds = [
        { endpoint: "a", height: 100 },
        { endpoint: "b", height: 90 },
      ];
      global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(seeds) });
      const health = await getNetworkHealth("mainnet-custom", 15);
      expect(health.online).toBe(2);
      expect(health.healthy).toBe(true);
    });

    it("treats missing/non-numeric heights as 0", async () => {
      const seeds = [{ endpoint: "a", height: 100 }, { endpoint: "b" /* no height */ }];
      global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(seeds) });
      const health = await getNetworkHealth("mainnet-misheight");
      expect(health.tip).toBe(100);
      expect(health.online).toBe(1);
      expect(health.healthy).toBe(false);
    });
  });
});
