const mockGetList = vi.fn();
const mockGetCount = vi.fn();

vi.mock("@/services/transactionService", () => ({
  transactionService: {
    getList: (...args) => mockGetList(...args),
    getCount: (...args) => mockGetCount(...args),
  },
}));

vi.mock("@/services/cache", () => ({
  getCacheKey: vi.fn((...args) => args.join(":")),
  cachedRequest: vi.fn((_key, fn) => fn()),
  CACHE_TTL: { price: 30000 },
}));

import { useGasOracle, getGasPrice } from "@/composables/useGasOracle";

describe("useGasOracle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetList.mockResolvedValue({ result: [], totalCount: 0 });
    mockGetCount.mockResolvedValue(0);
  });

  it("returns the expected API shape", () => {
    const oracle = useGasOracle();
    expect(oracle).toHaveProperty("refresh");
    expect(oracle).toHaveProperty("suggestions");
    expect(oracle).toHaveProperty("pendingCount");
    expect(oracle).toHaveProperty("networkFee");
    expect(oracle).toHaveProperty("systemFee");
    expect(oracle).toHaveProperty("lastUpdate");
    expect(oracle).toHaveProperty("isLoading");
    expect(oracle).toHaveProperty("error");
    expect(typeof oracle.refresh).toBe("function");
  });

  it("initialises with isLoading false and error null", () => {
    const { isLoading, error } = useGasOracle();
    expect(isLoading.value).toBe(false);
    expect(error.value).toBeNull();
  });

  it("sets isLoading to true then false after refresh completes", async () => {
    mockGetList.mockResolvedValue({ result: [], totalCount: 0 });
    mockGetCount.mockResolvedValue(0);

    const { refresh, isLoading } = useGasOracle();

    // Before refresh
    expect(isLoading.value).toBe(false);

    const p = refresh();
    // Synchronously after calling refresh, isLoading is true
    expect(isLoading.value).toBe(true);

    await p;
    expect(isLoading.value).toBe(false);
  });

  it("averages fees from latest 10 transactions (#187 — replaces GetNetFeeRange)", async () => {
    mockGetList.mockResolvedValue({
      result: [
        { netfee: 100_000_000, sysfee: 50_000_000 },
        { netfee: 100_000_000, sysfee: 50_000_000 },
      ],
      totalCount: 2,
    });
    mockGetCount.mockResolvedValue(5);

    const { refresh, networkFee, systemFee, pendingCount } = useGasOracle();
    await refresh();

    expect(networkFee.value).toBe(1);
    expect(systemFee.value).toBe(0.5);
    expect(pendingCount.value).toBe(5);
  });

  it("produces formatted suggestions (6 decimal strings)", async () => {
    mockGetList.mockResolvedValue({
      result: [{ netfee: 100_000_000, sysfee: 0 }],
      totalCount: 1,
    });
    mockGetCount.mockResolvedValue(3);

    const { refresh, suggestions } = useGasOracle();
    await refresh();

    const s = suggestions.value;
    expect(s).toHaveProperty("slow");
    expect(s).toHaveProperty("average");
    expect(s).toHaveProperty("fast");
    // All formatted to 6 decimals
    Object.values(s).forEach((v) => expect(v).toMatch(/^\d+\.\d{6}$/));
  });

  it("does not propagate errors swallowed by updateOracle", async () => {
    mockGetList.mockRejectedValue(new Error("network down"));
    mockGetCount.mockRejectedValue(new Error("network down"));

    const { refresh, error, isLoading } = useGasOracle();
    await refresh();

    // The error is caught inside updateOracle's try/catch, not re-thrown
    expect(error.value).toBeNull();
    expect(isLoading.value).toBe(false);
  });

  it("handles high mempool pressure (pending >= 50)", async () => {
    mockGetList.mockResolvedValue({
      result: [{ netfee: 200_000_000, sysfee: 100_000_000 }],
      totalCount: 1,
    });
    mockGetCount.mockResolvedValue(100);

    const { refresh, suggestions } = useGasOracle();
    await refresh();

    const s = suggestions.value;
    // Under high pressure the fast suggestion should be >= 0.01
    expect(parseFloat(s.fast)).toBeGreaterThanOrEqual(0.01);
    expect(parseFloat(s.slow)).toBeGreaterThanOrEqual(0.001);
  });

  it("accepts indexer snake_case net_fee/sys_fee fields too", async () => {
    mockGetList.mockResolvedValue({
      result: [{ net_fee: 200_000_000, sys_fee: 100_000_000 }],
      totalCount: 1,
    });
    mockGetCount.mockResolvedValue(0);

    const { refresh, networkFee, systemFee } = useGasOracle();
    await refresh();

    expect(networkFee.value).toBe(2);
    expect(systemFee.value).toBe(1);
  });
});

describe("getGasPrice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetList.mockResolvedValue({ result: [], totalCount: 0 });
    mockGetCount.mockResolvedValue(0);
  });

  it("returns formatted suggestions object", async () => {
    const result = await getGasPrice();
    expect(result).toHaveProperty("slow");
    expect(result).toHaveProperty("average");
    expect(result).toHaveProperty("fast");
  });
});
