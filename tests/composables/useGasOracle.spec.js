import { ref, computed, reactive } from "vue";

const mockSafeRpc = vi.fn();

vi.mock("@/services/api", () => ({
  safeRpc: (...args) => mockSafeRpc(...args),
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
    mockSafeRpc.mockResolvedValue(null);
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
    mockSafeRpc.mockResolvedValue(null);

    const { refresh, isLoading } = useGasOracle();

    // Before refresh
    expect(isLoading.value).toBe(false);

    const p = refresh();
    // Synchronously after calling refresh, isLoading is true
    expect(isLoading.value).toBe(true);

    await p;
    expect(isLoading.value).toBe(false);
  });

  it("updates networkFee and systemFee from RPC response", async () => {
    mockSafeRpc.mockImplementation((method) => {
      if (method === "GetNetFeeRange") return Promise.resolve({ networkFee: 100000000, systemFee: 50000000 });
      return Promise.resolve(5);
    });

    const { refresh, networkFee, systemFee, pendingCount } = useGasOracle();
    await refresh();

    expect(networkFee.value).toBe(1);
    expect(systemFee.value).toBe(0.5);
    expect(pendingCount.value).toBe(5);
  });

  it("produces formatted suggestions (6 decimal strings)", async () => {
    mockSafeRpc.mockImplementation((method) => {
      if (method === "GetNetFeeRange") return Promise.resolve({ networkFee: 100000000, systemFee: 0 });
      return Promise.resolve(3);
    });

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
    // updateOracle catches errors internally and console.warns them,
    // so refresh() should complete without setting error.
    mockSafeRpc.mockRejectedValue(new Error("network down"));

    const { refresh, error, isLoading } = useGasOracle();
    await refresh();

    // The error is caught inside updateOracle's try/catch, not re-thrown
    expect(error.value).toBeNull();
    expect(isLoading.value).toBe(false);
  });

  it("handles high mempool pressure (pending >= 50)", async () => {
    mockSafeRpc.mockImplementation((method) => {
      if (method === "GetNetFeeRange") return Promise.resolve({ networkFee: 200000000, systemFee: 100000000 });
      return Promise.resolve(100);
    });

    const { refresh, suggestions } = useGasOracle();
    await refresh();

    const s = suggestions.value;
    // Under high pressure the fast suggestion should be >= 0.01
    expect(parseFloat(s.fast)).toBeGreaterThanOrEqual(0.01);
    expect(parseFloat(s.slow)).toBeGreaterThanOrEqual(0.001);
  });

  it("handles alternative RPC field names (netfee / sysfee)", async () => {
    mockSafeRpc.mockImplementation((method) => {
      if (method === "GetNetFeeRange") return Promise.resolve({ netfee: 200000000, sysfee: 100000000 });
      return Promise.resolve(0);
    });

    const { refresh, networkFee, systemFee } = useGasOracle();
    await refresh();

    expect(networkFee.value).toBe(2);
    expect(systemFee.value).toBe(1);
  });
});

describe("getGasPrice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeRpc.mockResolvedValue(null);
  });

  it("returns formatted suggestions object", async () => {
    const result = await getGasPrice();
    expect(result).toHaveProperty("slow");
    expect(result).toHaveProperty("average");
    expect(result).toHaveProperty("fast");
  });
});
