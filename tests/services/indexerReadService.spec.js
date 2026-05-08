import { beforeEach, describe, expect, it, vi } from "vitest";

describe("indexerReadService freshness controls", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("probes same-origin hot-read freshness route for force-refresh homepage reads", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "Mainnet"),
      resolveNetworkName: vi.fn(() => "mainnet"),
    }));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { last_indexed_block: 100, freshness_seconds: 5 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], paging: { total: 0 } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");
    await indexerReadService.getBlocks(6, 0, { forceRefresh: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toMatch(/^\/data\/mainnet\/summary\?_ts=\d+$/);
    expect(fetchMock.mock.calls[1][0]).toMatch(
      /^\/data\/mainnet\/blocks\?limit=6&offset=0&_ts=\d+$/,
    );
    expect(fetchMock.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({
          Accept: "application/json",
        }),
      })
    );
  });

  it("uses the same-origin primary route first for testnet indexer reads by default", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "TestT5"),
      resolveNetworkName: vi.fn(() => "testnet"),
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], paging: { total: 0 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");
    await indexerReadService.getTransactions(6, 0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/data/testnet/transactions?limit=6&offset=0");
    expect(fetchMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        method: "GET",
      })
    );
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("cache");
  });

  // Removed: "falls back through same-origin backup proxy routes" — single server, no fallback paths.
  // Removed: "promotes the freshest same-origin backup route for hot reads" — single server, only one origin.
  // Removed: "reuses the cached freshest hot-read origin" — single server, only one origin.

  it("coalesces concurrent getSummary calls into a single fetch chain", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "Mainnet"),
      resolveNetworkName: vi.fn(() => "mainnet"),
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { last_indexed_block: 100 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");

    // Fan out 5 concurrent getSummary() calls — the home page does this
    // through HomePage.vue + 4 services that each independently load the
    // summary on mount. Without dedup, each call triggers its own probe
    // (selectFreshestHotIndexerBase) plus its own data fetch — 2 fetches
    // per call, 10 total. With dedup, the first call's probe + data
    // fetch (2 total) is shared by all 5 callers.
    const results = await Promise.all(Array.from({ length: 5 }, () => indexerReadService.getSummary()));

    expect(results).toHaveLength(5);
    expect(results.every((r) => r?.last_indexed_block === 100)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("coalesces concurrent getContractOverview calls per network+hash", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "Mainnet"),
      resolveNetworkName: vi.fn(() => "mainnet"),
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { hash: "0xabc", tx_count: 42 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");

    // ContractDetail mount fans out: page header (getByHash → overview)
    // + ScCallTable.usePagination (getScCalls → overviewPromise) hit
    // /contracts/<hash> in the same tick. Without dedup, two fetches.
    const [a, b] = await Promise.all([
      indexerReadService.getContractOverview("0xabc"),
      indexerReadService.getContractOverview("0xabc"),
    ]);

    expect(a).toEqual({ hash: "0xabc", tx_count: 42 });
    expect(b).toBe(a);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/data/mainnet/contracts/0xabc");
  });

  it("serves getSummary from a short result cache when calls land within the TTL", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "Mainnet"),
      resolveNetworkName: vi.fn(() => "mainnet"),
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { last_indexed_block: 100 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");

    // First call hits the wire (probe + actual = 2 fetches). The second
    // and third calls land within the 500ms TTL window and should be
    // served from the result cache, no new network calls. The
    // in-flight dedup alone wouldn't catch these — by the time call 2
    // runs, call 1 has already settled and cleared its slot.
    await indexerReadService.getSummary();
    await indexerReadService.getSummary();
    await indexerReadService.getSummary();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("getSummary forceRefresh bypasses the result cache", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "Mainnet"),
      resolveNetworkName: vi.fn(() => "mainnet"),
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { last_indexed_block: 100, freshness_seconds: 5 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");

    await indexerReadService.getSummary();
    const baseline = fetchMock.mock.calls.length;

    // forceRefresh path: must not return cached data, must hit wire again.
    await indexerReadService.getSummary({ forceRefresh: true });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(baseline);
  });

  it("releases the in-flight slot after settle so subsequent calls re-fetch", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "Mainnet"),
      resolveNetworkName: vi.fn(() => "mainnet"),
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { last_indexed_block: 50 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");

    // forceRefresh bypasses the result cache so each call hits the
    // wire (or the freshest-base cache, but that's a separate layer).
    await indexerReadService.getSummary({ forceRefresh: true });
    await indexerReadService.getSummary({ forceRefresh: true });

    // First call: 1 probe + 1 data fetch = 2.
    // Second call: probe cached for 30s (0 fetches) + 1 data fetch = 1.
    // Total 3 — proves the in-flight slot was released between calls
    // (without that release, call 2 would return call 1's settled
    // promise and fire 0 new fetches, total 2).
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("returns null when the single indexer route fails", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "Mainnet"),
      resolveNetworkName: vi.fn(() => "mainnet"),
    }));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");
    const payload = await indexerReadService.getBlocks(1, 0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/data/mainnet/blocks?limit=1&offset=0");
    expect(payload).toBeNull();
  });
});
