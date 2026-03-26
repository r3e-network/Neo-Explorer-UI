import { beforeEach, describe, expect, it, vi } from "vitest";

describe("indexerReadService freshness controls", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("probes hot-read freshness through api.n3index.dev first for force-refresh homepage reads", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "Mainnet"),
    }));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { last_indexed_block: 100, freshness_seconds: 5 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { last_indexed_block: 99, freshness_seconds: 6 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { last_indexed_block: 98, freshness_seconds: 7 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { last_indexed_block: 97, freshness_seconds: 8 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], paging: { total: 0 } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");
    await indexerReadService.getBlocks(6, 0, { forceRefresh: true });

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock.mock.calls[0][0]).toMatch(/^https:\/\/api\.n3index\.dev\/mainnet\/summary\?_ts=\d+$/);
    expect(fetchMock.mock.calls[4][0]).toMatch(
      /^https:\/\/api\.n3index\.dev\/mainnet\/blocks\?limit=6&offset=0&_ts=\d+$/,
    );
    expect(fetchMock.mock.calls[4][1]).toEqual(
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({
          Accept: "application/json",
        }),
      })
    );
  });

  it("uses api.n3index.dev first for testnet indexer reads by default", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "TestT5"),
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], paging: { total: 0 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");
    await indexerReadService.getTransactions(6, 0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.n3index.dev/testnet/transactions?limit=6&offset=0");
    expect(fetchMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        method: "GET",
      })
    );
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("cache");
  });

  it("falls back through api1/api2/api3 before the same-origin proxy when the primary origin fails", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "Mainnet"),
    }));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ block_index: 1 }], paging: { total: 1 } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");
    const payload = await indexerReadService.getBlocks(1, 0);

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.n3index.dev/mainnet/blocks?limit=1&offset=0");
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.n3index.dev/mainnet/blocks?limit=1&offset=0");
    expect(fetchMock.mock.calls[2][0]).toBe("https://api1.n3index.dev/mainnet/blocks?limit=1&offset=0");
    expect(fetchMock.mock.calls[3][0]).toBe("https://api2.n3index.dev/mainnet/blocks?limit=1&offset=0");
    expect(fetchMock.mock.calls[4][0]).toBe("https://api3.n3index.dev/mainnet/blocks?limit=1&offset=0");
    expect(payload).toEqual({ data: [{ block_index: 1 }], paging: { total: 1 } });
  });

  it("promotes the freshest indexed origin for hot reads when api.n3index.dev is behind", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "Mainnet"),
    }));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { last_indexed_block: 100, freshness_seconds: 45 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { last_indexed_block: 105, freshness_seconds: 5 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { last_indexed_block: 103, freshness_seconds: 7 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { last_indexed_block: 104, freshness_seconds: 6 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ block_index: 105 }], paging: { total: 106 } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");
    const payload = await indexerReadService.getBlocks(1, 0, { forceRefresh: true });

    expect(fetchMock.mock.calls[0][0]).toMatch(/^https:\/\/api\.n3index\.dev\/mainnet\/summary\?_ts=\d+$/);
    expect(fetchMock.mock.calls[1][0]).toMatch(/^https:\/\/api1\.n3index\.dev\/mainnet\/summary\?_ts=\d+$/);
    expect(fetchMock.mock.calls[2][0]).toMatch(/^https:\/\/api2\.n3index\.dev\/mainnet\/summary\?_ts=\d+$/);
    expect(fetchMock.mock.calls[3][0]).toMatch(/^https:\/\/api3\.n3index\.dev\/mainnet\/summary\?_ts=\d+$/);
    expect(fetchMock.mock.calls[4][0]).toMatch(/^https:\/\/api1\.n3index\.dev\/mainnet\/blocks\?limit=1&offset=0&_ts=\d+$/);
    expect(payload).toEqual({ data: [{ block_index: 105 }], paging: { total: 106 } });
  });

  it("reuses the cached freshest hot-read origin instead of probing on every call", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "Mainnet"),
    }));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { last_indexed_block: 100, freshness_seconds: 45 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { last_indexed_block: 105, freshness_seconds: 5 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { last_indexed_block: 103, freshness_seconds: 7 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { last_indexed_block: 104, freshness_seconds: 6 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ block_index: 105 }], paging: { total: 106 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ block_index: 104 }], paging: { total: 106 } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");
    await indexerReadService.getBlocks(1, 0, { forceRefresh: true });
    await indexerReadService.getTransactions(1, 0, { forceRefresh: true });

    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(fetchMock.mock.calls[4][0]).toMatch(/^https:\/\/api1\.n3index\.dev\/mainnet\/blocks\?limit=1&offset=0&_ts=\d+$/);
    expect(fetchMock.mock.calls[5][0]).toMatch(/^https:\/\/api1\.n3index\.dev\/mainnet\/transactions\?limit=1&offset=0&_ts=\d+$/);
  });
});
