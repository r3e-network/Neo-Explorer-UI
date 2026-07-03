import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.hoisted(() => vi.fn());
const cachedRequestMock = vi.hoisted(() => vi.fn(async (_key, loader) => loader()));
const transactionServiceGetListMock = vi.hoisted(() => vi.fn());
const indexerReadServiceGetSummaryMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/api", () => ({
  rpc: rpcMock,
}));

vi.mock("@/services/cache", () => ({
  CACHE_TTL: { chart: 300000, stats: 60000 },
  getCacheKey: vi.fn(() => "key"),
  cachedRequest: cachedRequestMock,
}));

vi.mock("@/services/serviceFactory", () => ({
  createService: (_definitions, methods) => methods,
  getRealtimeListCacheOptions: vi.fn((options = {}) => ({ ...(options || {}) })),
}));

vi.mock("@/services/indexerReadService", () => ({
  indexerReadService: { getSummary: indexerReadServiceGetSummaryMock },
}));

vi.mock("@/services/transactionService", () => ({
  transactionService: { getList: transactionServiceGetListMock },
}));

vi.mock("@/utils/env", () => ({
  getCurrentEnv: () => "Mainnet",
  resolveNetworkName: vi.fn((env) => {
    const value = String(env || "mainnet").toLowerCase();
    return value.includes("test") ? "testnet" : "mainnet";
  }),
}));

describe("statsService.getGasTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes through indexer-first transactionService.getList (#177)", async () => {
    transactionServiceGetListMock.mockResolvedValue({
      result: [{ netfee: "1000000", sysfee: "5000000" }],
      totalCount: 1,
    });

    const { statsService } = await import("@/services/statsService");
    const result = await statsService.getGasTracker(true);

    expect(transactionServiceGetListMock).toHaveBeenCalledWith(1, 0, { forceRefresh: true });
    expect(rpcMock).not.toHaveBeenCalledWith("GetTransactionList", expect.any(Object));
    expect(result).toEqual({
      latestNetworkFee: "1000000",
      latestSystemFee: "5000000",
      networkFee: null,
    });
  });

  it("accepts indexer snake_case net_fee/sys_fee fields too", async () => {
    transactionServiceGetListMock.mockResolvedValue({
      result: [{ net_fee: "200", sys_fee: "300" }],
      totalCount: 1,
    });

    const { statsService } = await import("@/services/statsService");
    const result = await statsService.getGasTracker(false);

    expect(result.latestNetworkFee).toBe("200");
    expect(result.latestSystemFee).toBe("300");
  });

  it("routes gas tracker through the requested network", async () => {
    transactionServiceGetListMock.mockResolvedValue({
      result: [{ net_fee: "200", sys_fee: "300" }],
      totalCount: 1,
    });

    const { statsService } = await import("@/services/statsService");
    await statsService.getGasTracker({ forceRefresh: true, network: "testnet" });

    expect(transactionServiceGetListMock).toHaveBeenCalledWith(1, 0, {
      forceRefresh: true,
      network: "testnet",
    });
  });

  it("returns zeros when getList yields no rows", async () => {
    transactionServiceGetListMock.mockResolvedValue({ result: [], totalCount: 0 });

    const { statsService } = await import("@/services/statsService");
    const result = await statsService.getGasTracker(false);

    expect(result).toEqual({ latestNetworkFee: "0", latestSystemFee: "0", networkFee: null });
  });
});

describe("statsService.getDashboardStats (#185/#26)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // #26: getDashboardStats no longer probes /transactions with a
    // two-LATERAL count query — assert no such fetch fires anywhere below.
    globalThis.fetch = vi.fn();
  });

  it("returns only the block-height count Blocks.vue consumes; no Mongo POSTs, no tx-total probe (#26)", async () => {
    // The summary carries counts the old shape dead-mapped, but the trimmed
    // service returns just { blocks }. Note the mock no longer fabricates
    // total_contract_count / total_candidate_count — NetworkSummary never
    // emitted them, so keeping them in the mock masked the dead reads.
    indexerReadServiceGetSummaryMock.mockResolvedValue({
      total_block_count: 9_627_999,
      total_tx_count: 6_655_123,
      total_address_count: 184_000,
      total_asset_count: 240,
    });

    const { statsService } = await import("@/services/statsService");
    const result = await statsService.getDashboardStats(true);

    expect(result).toEqual({ blocks: 9_627_999 });
    // No PascalCase Mongo POSTs (the #185 regression) and no /transactions
    // count probe (the #26 dead two-LATERAL query).
    expect(rpcMock).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("falls back to standard getblockcount only when summary lacks total_block_count", async () => {
    indexerReadServiceGetSummaryMock.mockResolvedValue({
      total_block_count: 0,
    });
    rpcMock.mockResolvedValueOnce(9_628_000);

    const { statsService } = await import("@/services/statsService");
    const result = await statsService.getDashboardStats(false);

    expect(rpcMock).toHaveBeenCalledWith("getblockcount", [], { network: "mainnet" });
    expect(result).toEqual({ blocks: 9_628_000 });
  });

  it("routes dashboard summary and block-count fallback through the requested network", async () => {
    indexerReadServiceGetSummaryMock.mockResolvedValue({
      total_block_count: 0,
    });
    rpcMock.mockResolvedValueOnce(9_628_000);

    const { statsService } = await import("@/services/statsService");
    const result = await statsService.getDashboardStats({ forceRefresh: true, network: "testnet" });

    expect(indexerReadServiceGetSummaryMock).toHaveBeenCalledWith(
      expect.objectContaining({ forceRefresh: true, network: "testnet" }),
    );
    expect(rpcMock).toHaveBeenCalledWith("getblockcount", [], { network: "testnet" });
    expect(result).toEqual({ blocks: 9_628_000 });
  });

  it("returns blocks: 0 for a missing summary without firing legacy POSTs or the tx-total probe (#26)", async () => {
    indexerReadServiceGetSummaryMock.mockResolvedValue({
      total_block_count: 1,
    });

    const { statsService } = await import("@/services/statsService");
    const result = await statsService.getDashboardStats(false);

    expect(result).toEqual({ blocks: 1 });
    expect(rpcMock).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
