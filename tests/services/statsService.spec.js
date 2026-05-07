import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.hoisted(() => vi.fn());
const cachedRequestMock = vi.hoisted(() => vi.fn(async (_key, loader) => loader()));
const transactionServiceGetListMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/api", () => ({
  rpc: rpcMock,
}));

vi.mock("@/services/cache", () => ({
  CACHE_TTL: { chart: 300000 },
  getCacheKey: vi.fn(() => "gas_tracker"),
  cachedRequest: cachedRequestMock,
}));

vi.mock("@/services/serviceFactory", () => ({
  createService: (_definitions, methods) => methods,
  getRealtimeListCacheOptions: vi.fn(() => ({})),
}));

vi.mock("@/services/indexerReadService", () => ({
  indexerReadService: {},
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
