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
  getRealtimeListCacheOptions: vi.fn(() => ({})),
}));

vi.mock("@/services/indexerReadService", () => ({
  indexerReadService: { getSummary: indexerReadServiceGetSummaryMock },
}));

vi.mock("@/services/transactionService", () => ({
  transactionService: { getList: transactionServiceGetListMock },
}));

vi.mock("@/utils/env", () => ({
  getCurrentEnv: () => "Mainnet",
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

  it("returns zeros when getList yields no rows", async () => {
    transactionServiceGetListMock.mockResolvedValue({ result: [], totalCount: 0 });

    const { statsService } = await import("@/services/statsService");
    const result = await statsService.getGasTracker(false);

    expect(result).toEqual({ latestNetworkFee: "0", latestSystemFee: "0", networkFee: null });
  });
});

describe("statsService.getDashboardStats (#185)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads all counts from indexer summary; no PascalCase Mongo POSTs fire", async () => {
    indexerReadServiceGetSummaryMock.mockResolvedValue({
      total_block_count: 9_627_999,
      total_tx_count: 6_655_123,
      total_contract_count: 8421,
      total_candidate_count: 39,
      total_address_count: 184_000,
      total_asset_count: 240,
    });

    const { statsService } = await import("@/services/statsService");
    const result = await statsService.getDashboardStats(true);

    expect(result).toEqual({
      blocks: 9_627_999,
      txs: 6_655_123,
      contracts: 8421,
      candidates: 39,
      addresses: 184_000,
      tokens: 240,
    });
    // Crucial: no GetContractCount / GetCandidateCount / GetBlockCount /
    // GetTransactionCount POSTs — that was the #185 regression.
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("falls back to standard getblockcount only when summary lacks total_block_count", async () => {
    indexerReadServiceGetSummaryMock.mockResolvedValue({
      total_tx_count: 100,
      total_block_count: 0,
    });
    rpcMock.mockResolvedValueOnce(9_628_000);

    const { statsService } = await import("@/services/statsService");
    const result = await statsService.getDashboardStats(false);

    expect(rpcMock).toHaveBeenCalledWith("getblockcount", []);
    expect(result.blocks).toBe(9_628_000);
    // Other stats still come from summary.
    expect(result.txs).toBe(100);
  });

  it("returns zeros for missing summary fields without firing legacy POSTs", async () => {
    indexerReadServiceGetSummaryMock.mockResolvedValue({
      total_block_count: 1,
      // total_tx_count, total_contract_count, etc. all absent
    });

    const { statsService } = await import("@/services/statsService");
    const result = await statsService.getDashboardStats(false);

    expect(result.blocks).toBe(1);
    expect(result.contracts).toBe(0);
    expect(result.candidates).toBe(0);
    expect(result.addresses).toBe(0);
    expect(result.tokens).toBe(0);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
