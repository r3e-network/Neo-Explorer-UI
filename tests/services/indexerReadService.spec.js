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

  it("records read-api observability headers for indexer responses", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "Mainnet"),
      resolveNetworkName: vi.fn(() => "mainnet"),
    }));

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [], paging: { total: 0 } }), {
        status: 200,
        headers: {
          "X-Request-Id": "req_indexer_1",
          "X-Edge-Cache": "HIT",
          "Server-Timing": "neo3fura-edge;dur=4",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");
    await indexerReadService.getTransactions(6, 0);
    const { getRecentApiObservations } = await import("../../src/telemetry/apiObservability.js");

    expect(getRecentApiObservations()).toEqual([
      expect.objectContaining({
        requestId: "req_indexer_1",
        edgeCache: "HIT",
        source: "indexer",
        method: "GET",
        url: "/data/mainnet/transactions?limit=6&offset=0",
        durationMs: expect.any(Number),
      }),
    ]);
  });

  it("fetches the aggregated explorer home payload from the read-api", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "Mainnet"),
      resolveNetworkName: vi.fn(() => "mainnet"),
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          network: "mainnet",
          summary: { total_block_count: 123 },
          latest_blocks: [{ hash: "0xblock" }],
          latest_transactions: [{ txid: "0xtx" }],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");
    const payload = await indexerReadService.getExplorerHome(6, { forceRefresh: true });

    expect(fetchMock.mock.calls[0][0]).toMatch(/^\/data\/mainnet\/explorer\/home\?limit=6&_ts=\d+$/);
    expect(payload).toEqual(
      expect.objectContaining({
        network: "mainnet",
        summary: { total_block_count: 123 },
      }),
    );
  });

  it("fetches search payloads from the short read-api route", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "Mainnet"),
      resolveNetworkName: vi.fn(() => "mainnet"),
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          source: "meilisearch",
          hits: [{ type: "token", title: "GasToken", hash: "0xgas" }],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");
    const payload = await indexerReadService.search("gas", { type: "token", limit: 6 });

    expect(fetchMock.mock.calls[0][0]).toBe("/data/mainnet/search?q=gas&limit=6&type=token");
    expect(payload).toEqual({
      source: "meilisearch",
      hits: [{ type: "token", title: "GasToken", hash: "0xgas" }],
    });
  });

  it("temporarily skips the aggregated explorer home endpoint after it is unavailable", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "Mainnet"),
      resolveNetworkName: vi.fn(() => "mainnet"),
    }));

    const fetchMock = vi.fn().mockResolvedValue(new Response("not found", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");

    expect(await indexerReadService.getExplorerHome(6)).toBeNull();
    expect(await indexerReadService.getExplorerHome(6)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
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

  it("reads per-contract calls from the short read-api route", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "Mainnet"),
      resolveNetworkName: vi.fn(() => "mainnet"),
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ txid: "0xt1", block_index: 100 }],
        paging: { total: 1 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");
    const payload = await indexerReadService.getContractCalls("0xabc", 20, 40);

    expect(payload).toEqual({
      data: [{ txid: "0xt1", block_index: 100 }],
      paging: { total: 1 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/data/mainnet/contracts/0xabc/calls?limit=20&offset=40");
  });

  it("reads token holders from the short read-api route", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "Mainnet"),
      resolveNetworkName: vi.fn(() => "mainnet"),
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ address: "Nabc", balance_raw: "100" }],
        meta: { total: 1 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");
    const payload = await indexerReadService.getTokenHolders("0xgas", 10, 5);

    expect(payload).toEqual({
      data: [{ address: "Nabc", balance_raw: "100" }],
      meta: { total: 1 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/data/mainnet/tokens/0xgas/holders?limit=10&offset=5");
  });

  it("reads candidate voters from the short read-api route", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "Mainnet"),
      resolveNetworkName: vi.fn(() => "mainnet"),
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ script_hash: "0xabc", votes: "42" }],
        meta: { total: 1 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");
    const payload = await indexerReadService.getCandidateVoters("02abc", 10, 5);

    expect(payload).toEqual({
      data: [{ script_hash: "0xabc", votes: "42" }],
      meta: { total: 1 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/data/mainnet/governance/voters?candidate=02abc&limit=10&offset=5");
  });

  it("builds the realtime head SSE URL from the active network base", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "TestT5"),
      resolveNetworkName: vi.fn(() => "testnet"),
    }));

    const { getIndexerSseUrl } = await import("../../src/services/indexerReadService.js");

    expect(getIndexerSseUrl()).toBe("/data/testnet/sse/head");
    expect(getIndexerSseUrl("mainnet")).toBe("/data/mainnet/sse/head");
  });

  it("can load a NEP-11 token without first hitting the NEP-17-only token detail endpoint", async () => {
    vi.doMock("../../src/utils/env.js", () => ({
      getCurrentEnv: vi.fn(() => "Mainnet"),
      resolveNetworkName: vi.fn(() => "mainnet"),
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { contract_hash: "0xother", standard: "NEP11" },
          { contract_hash: "0xabc", standard: "NEP11", display_name: "Example NFT" },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { indexerReadService } = await import("../../src/services/indexerReadService.js");
    const token = await indexerReadService.getToken("0xabc", { standard: "NEP11" });

    expect(token).toEqual({ contract_hash: "0xabc", standard: "NEP11", display_name: "Example NFT" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/data/mainnet/tokens?standard=NEP11&limit=200");
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
