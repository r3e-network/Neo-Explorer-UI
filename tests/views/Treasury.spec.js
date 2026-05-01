import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key) => key;
  },
};

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

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

vi.mock("@cityofzion/neon-js", () => {
  // @/utils/neonLoader's findNeonJs only accepts modules whose `tx.Transaction.deserialize`
  // and `rpc.RPCClient` are both present. Provide that shape so loadNeonJs() picks
  // this mock instead of returning null and falling back to the test's window.Neon.
  const RPCClient = class {
    async getNep17Balances(addr) {
      return getNep17BalancesMock(addr);
    }
  };
  const Transaction = class {
    static deserialize() {
      return new Transaction();
    }
  };
  const neonMock = {
    rpc: { RPCClient },
    tx: { Transaction },
  };
  neonMock.default = neonMock;
  return neonMock;
});

describe("Treasury view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.Neon = {
      rpc: {
        RPCClient: class {
          async getNep17Balances(input) {
            return getNep17BalancesMock(input);
          }
        },
      },
    };
    getNep17BalancesMock.mockImplementation(async (input) => {
      if (typeof input !== "string" || !input) {
        throw new Error("expected positional address string input");
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
        plugins: [i18nPlugin],
        stubs: {
          Breadcrumb: true,
          HashLink: true,
          Skeleton: true,
        },
      },
    });

    await flushPromises();

    expect(getNep17BalancesMock).toHaveBeenCalledWith("NtestTreasuryAddress");
    expect(wrapper.text()).toContain("12");
    expect(wrapper.text()).toContain("1.5");
  });
});
