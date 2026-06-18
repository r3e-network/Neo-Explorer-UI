const { getIndexerBaseUrlsMock, resolveNetworkNameMock } = vi.hoisted(() => ({
  getIndexerBaseUrlsMock: vi.fn(),
  resolveNetworkNameMock: vi.fn(),
}));

vi.mock("@/services/indexerReadService", () => ({
  getIndexerBaseUrls: getIndexerBaseUrlsMock,
}));

vi.mock("@/utils/env", () => ({
  resolveNetworkName: resolveNetworkNameMock,
}));

function jsonResponse(data, headers = {}) {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });
}

describe("indexerStatusService", () => {
  let service;
  let resetObservability;

  beforeEach(async () => {
    vi.resetModules();
    getIndexerBaseUrlsMock.mockReset().mockReturnValue(["/data/mainnet"]);
    resolveNetworkNameMock.mockReset().mockImplementation((network) =>
      String(network || "mainnet").toLowerCase().includes("test") ? "testnet" : "mainnet",
    );
    global.fetch = vi.fn();
    service = await import("@/services/indexerStatusService");
    const telemetry = await import("@/telemetry/apiObservability");
    resetObservability = telemetry.__resetApiObservabilityForTests;
    resetObservability();
    service.__resetIndexerStatusServiceForTests();
  });

  afterEach(() => {
    resetObservability();
    service.__resetIndexerStatusServiceForTests();
    delete global.fetch;
  });

  it("fetches status and summary, normalizes health, and preserves edge diagnostics", async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse(
        {
          network: "mainnet",
          ready: true,
          reason: "ok",
          last_indexed_block: 100,
          chain_tip_block: 101,
          lag_blocks: 1,
          freshness_seconds: 2,
          max_freshness_seconds: 300,
          updated_at: "2026-06-18T00:00:00Z",
        },
        {
          "X-Request-Id": "req_status",
          "X-Neo3fura-Cache": "MISS",
          "Server-Timing": 'neo3fura-cache;desc="miss", origin;dur=8.4',
        },
      ))
      .mockResolvedValueOnce(jsonResponse(
        {
          network: "mainnet",
          indexed_tx_count: 10,
          total_tx_count: 15,
          active_address_count_7d: 3,
          summary_source: "neotube",
        },
        {
          "X-Request-Id": "req_summary",
          "X-Neo3fura-Cache": "HIT",
        },
      ));

    const snapshot = await service.getIndexerHealthSnapshot("mainnet", { forceRefresh: true });

    expect(snapshot.status).toEqual(expect.objectContaining({
      network: "mainnet",
      ready: true,
      reason: "ok",
      lastIndexedBlock: 100,
      chainTipBlock: 101,
      lagBlocks: 1,
      freshnessSeconds: 2,
      maxFreshnessSeconds: 300,
    }));
    expect(snapshot.status.syncRatio).toBeCloseTo(100 / 101);
    expect(snapshot.summary).toEqual(expect.objectContaining({
      indexedTxCount: 10,
      totalTxCount: 15,
      activeAddressCount7d: 3,
      summarySource: "neotube",
    }));
    expect(snapshot.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ requestId: "req_status", neo3furaCache: "MISS" }),
        expect.objectContaining({ requestId: "req_summary", neo3furaCache: "HIT" }),
      ]),
    );
    expect(snapshot.observations[0].serverTimingMetrics).toContainEqual({ name: "origin", durationMs: 8.4 });
    expect(global.fetch.mock.calls[0][0]).toMatch(/^\/data\/mainnet\/status\?_ts=/);
    expect(global.fetch.mock.calls[1][0]).toMatch(/^\/data\/mainnet\/summary\?_ts=/);
  });

  it("infers stale status when readiness fields are absent", () => {
    const status = service.normalizeIndexerStatus({
      last_indexed_block: 100,
      chain_tip_block: 110,
      freshness_seconds: 301,
      max_freshness_seconds: 300,
    }, "mainnet");

    expect(status.ready).toBe(false);
    expect(status.reason).toBe("indexer_stale");
    expect(status.lagBlocks).toBe(10);
  });

  it("caches successful snapshots briefly when forceRefresh is false", async () => {
    global.fetch.mockImplementation((url) => {
      if (String(url).includes("/status")) {
        return Promise.resolve(jsonResponse({
          network: "mainnet",
          ready: true,
          last_indexed_block: 100,
          chain_tip_block: 100,
          freshness_seconds: 1,
        }));
      }
      return Promise.resolve(jsonResponse({
        indexed_tx_count: 5,
        total_tx_count: 5,
      }));
    });

    const first = await service.getIndexerHealthSnapshot("mainnet");
    const second = await service.getIndexerHealthSnapshot("mainnet");

    expect(first).toBe(second);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
