const { getCurrentEnvMock } = vi.hoisted(() => ({
  getCurrentEnvMock: vi.fn(),
}));

const { getIndexerBlocksMock } = vi.hoisted(() => ({
  getIndexerBlocksMock: vi.fn(),
}));

vi.mock("@/utils/env", () => ({
  getCurrentEnv: getCurrentEnvMock,
  NET_ENV: { Mainnet: "mainnet", TestT5: "testT5" },
  resolveNetworkName: () => "mainnet",
}));

vi.mock("@/services/indexerReadService", () => ({
  indexerReadService: {
    getBlocks: getIndexerBlocksMock,
  },
}));

let getSeeds;
let getLatestBlocks;
let getNetworkHealth;

describe("networkMonitorService", () => {
  beforeEach(async () => {
    vi.resetModules();
    getCurrentEnvMock.mockReset().mockReturnValue("mainnet");
    getIndexerBlocksMock.mockReset().mockResolvedValue(null);
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
        expect.stringContaining("/api/network-monitor?network=N3main&resource=seeds"),
        expect.any(Object),
      );
    });

    it("uses N3test slug for testnet env", async () => {
      global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
      await getSeeds("testnet");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/network-monitor?network=N3test&resource=seeds"),
        expect.any(Object),
      );
    });

    it("falls back to current env when no env provided (testnet branch)", async () => {
      getCurrentEnvMock.mockReturnValue("testT5");
      global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
      await getSeeds();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/network-monitor?network=N3test&resource=seeds"),
        expect.any(Object),
      );
    });

    it("falls back to direct NGD monitor URL when the same-origin proxy fails", async () => {
      const data = [{ endpoint: "seed2.neo.org", height: 100, version: "Neo:3.9.1", latency: 2 }];
      global.fetch
        .mockResolvedValueOnce({ ok: false, status: 502, json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) });

      const result = await getSeeds("mainnet-proxy-fallback");

      expect(result).toEqual(data);
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("/api/network-monitor?network=N3main&resource=seeds"),
        expect.any(Object),
      );
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("https://monitor.ngd.network/api/N3main/seeds"),
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

    it("re-fetches latest blocks after the short realtime TTL expires", async () => {
      const first = [{ height: 100, time: 1700000000, interval: 15, tx: 5 }];
      const second = [{ height: 101, time: 1700000004, interval: 4, tx: 1 }];
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(first) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(second) });

      expect(await getLatestBlocks("mainnet-latest-short-ttl")).toEqual(first);
      const realNow = Date.now;
      vi.spyOn(Date, "now").mockReturnValue(realNow() + 4_500);
      expect(await getLatestBlocks("mainnet-latest-short-ttl")).toEqual(second);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      Date.now.mockRestore();
    });

    it("enriches monitor block intervals with primary node data from the indexer", async () => {
      const data = [
        { height: 101, time: 1700000003, interval: 10, tx: 0 },
        { height: 100, time: 1700000000, interval: 3, tx: 2 },
      ];
      global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });
      getIndexerBlocksMock.mockResolvedValue({
        data: [
          {
            block_index: 101,
            hash: "0xabc",
            primary_node: 4,
            next_consensus: "NXZSaAQyqS8aF9t9MPJSUffiK15f1eiwWc",
          },
          {
            block_index: 100,
            primary_node: 3,
            next_consensus: "Nfallback",
          },
        ],
      });

      const result = await getLatestBlocks("mainnet-latest-enrich");

      expect(getIndexerBlocksMock).toHaveBeenCalledWith(
        expect.any(Number),
        0,
        expect.objectContaining({ forceRefresh: true }),
      );
      expect(result[0]).toMatchObject({
        height: 101,
        interval: 10,
        primaryNode: 4,
        primary_node: 4,
        nextConsensus: "NXZSaAQyqS8aF9t9MPJSUffiK15f1eiwWc",
        blockHash: "0xabc",
      });
      expect(result[1]).toMatchObject({
        height: 100,
        primaryNode: 3,
        nextConsensus: "Nfallback",
      });
    });

    it("keeps monitor rows when indexer enrichment fails", async () => {
      const data = [{ height: 102, time: 1700000006, interval: 6, tx: 1 }];
      global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });
      getIndexerBlocksMock.mockRejectedValue(new Error("indexer unavailable"));

      const result = await getLatestBlocks("mainnet-latest-indexer-error");

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
