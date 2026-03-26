import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.hoisted(() => vi.fn());
const cachedRequestMock = vi.hoisted(() => vi.fn(async (_key, loader) => loader()));

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

vi.mock("@/utils/env", () => ({
  getCurrentEnv: () => "Mainnet",
}));

describe("statsService.getGasTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the latest transaction list without calling unsupported GetNetFeeRange", async () => {
    rpcMock.mockResolvedValue({
      result: [{ netfee: "1000000", sysfee: "5000000" }],
    });

    const { statsService } = await import("@/services/statsService");
    const result = await statsService.getGasTracker(true);

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith("GetTransactionList", { Limit: 1, Skip: 0 });
    expect(result).toEqual({
      latestNetworkFee: "1000000",
      latestSystemFee: "5000000",
      networkFee: null,
    });
  });
});
