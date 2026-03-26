import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getNep17BalancesMock = vi.fn();

vi.mock("@/composables/usePriceCache", () => ({
  usePriceCache: () => ({
    fetchPrices: vi.fn().mockResolvedValue({ neo: 2, gas: 1 }),
  }),
}));

vi.mock("@/constants/knownAddresses", () => ({
  getTreasuryKnownAddresses: () => [
    {
      address: "NtestTreasuryAddress",
      name: "Neo Foundation (Da Hongfei)",
    },
  ],
}));

vi.mock("@/services/cache", () => ({
  CACHE_TTL: { chart: 60_000 },
  cachedRequest: vi.fn(async (_key, loader) => loader()),
}));

vi.mock("@/constants", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    NEO_HASH: "0xneo",
    GAS_HASH: "0xgas",
  };
});

vi.mock("@/utils/env", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getRpcClientUrl: () => "https://api.n3index.dev/mainnet",
    getCurrentEnv: () => "Mainnet",
  };
});

vi.mock("@/composables/useNetworkChange", () => ({
  useNetworkChange: vi.fn(),
}));

vi.mock("@r3e/neo-js-sdk", () => ({
  RpcClient: class {
    async getNep17Balances(input) {
      return getNep17BalancesMock(input);
    }
  },
}));

describe("Treasury view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getNep17BalancesMock.mockImplementation(async (input) => {
      if (!input || typeof input !== "object" || !input.account) {
        throw new Error("expected { account } input");
      }

      return {
        balance: [
          { assethash: "0xneo", amount: "12" },
          { assethash: "0xgas", amount: "150000000" },
        ],
      };
    });
  });

  it("loads treasury balances through the r3e RpcClient object input contract", async () => {
    const Treasury = (await import("@/views/Treasury/Treasury.vue")).default;
    const wrapper = mount(Treasury, {
      global: {
        stubs: {
          Breadcrumb: true,
          HashLink: true,
          Skeleton: true,
        },
      },
    });

    await flushPromises();

    expect(getNep17BalancesMock).toHaveBeenCalledWith({ account: "NtestTreasuryAddress" });
    expect(wrapper.text()).toContain("12");
    expect(wrapper.text()).toContain("1.5");
  });
});
