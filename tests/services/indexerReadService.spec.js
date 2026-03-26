import { beforeEach, describe, expect, it, vi } from "vitest";

describe("indexerReadService freshness controls", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("prefers the absolute indexer origin first for force-refresh homepage reads", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "Mainnet"),
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], paging: { total: 0 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");
    await indexerReadService.getBlocks(6, 0, { forceRefresh: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toMatch(
      /^https:\/\/api1\.n3index\.dev\/mainnet\/blocks\?limit=6&offset=0&_ts=\d+$/,
    );
    expect(fetchMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({
          Accept: "application/json",
        }),
      })
    );
  });

  it("uses the absolute testnet indexer path without cache busting by default", async () => {
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
    expect(fetchMock.mock.calls[0][0]).toBe("https://api1.n3index.dev/testnet/transactions?limit=6&offset=0");
    expect(fetchMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        method: "GET",
      })
    );
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("cache");
  });

  it("falls back to the same-origin proxy when the absolute indexer origin fails", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "Mainnet"),
    }));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ block_index: 1 }], paging: { total: 1 } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");
    const payload = await indexerReadService.getBlocks(1, 0);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api1.n3index.dev/mainnet/blocks?limit=1&offset=0");
    expect(fetchMock.mock.calls[1][0]).toBe("https://api1.n3index.dev/mainnet/blocks?limit=1&offset=0");
    expect(fetchMock.mock.calls[2][0]).toBe("/indexer/mainnet/blocks?limit=1&offset=0");
    expect(payload).toEqual({ data: [{ block_index: 1 }], paging: { total: 1 } });
  });
});
