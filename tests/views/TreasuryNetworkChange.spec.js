import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key) => key;
  },
};

const envState = { value: "MainNet" };
const fetchPricesMock = vi.hoisted(() => vi.fn().mockResolvedValue({ neo: 1, gas: 1 }));
const cachedRequestMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));

vi.mock("@/composables/usePriceCache", () => ({
  usePriceCache: () => ({ fetchPrices: fetchPricesMock }),
}));

vi.mock("@/utils/healthCheck", () => ({
  checkAndSetEndpoints: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/utils/env", () => ({
  getRpcClientUrl: () => "http://rpc.test",
  getCurrentEnv: () => envState.value,
  NETWORK_CHANGE_EVENT: "neo-explorer-network-change",
  NET_ENV: { TestT5: "TestT5", Mainnet: "MainNet" },
}));

vi.mock("@/components/common/HashLink.vue", () => ({
  default: { name: "HashLink", template: "<span><slot /></span>" },
}));

vi.mock("@/services/cache", () => ({
  cachedRequest: cachedRequestMock,
  CACHE_TTL: { chart: 300000 },
}));

vi.mock("@/constants/knownAddresses", () => ({
  getTreasuryKnownAddresses: () => [{ name: "Treasury A", address: "Naddr" }],
}));

vi.mock("@cityofzion/neon-js", () => {
  // Match the shape findNeonJs requires (rpc.RPCClient + tx.Transaction.deserialize)
  // so loadNeonJs() resolves to this mock.
  const RPCClient = class {};
  const Transaction = class {
    static deserialize() { return new Transaction(); }
  };
  const neonMock = { rpc: { RPCClient }, tx: { Transaction } };
  neonMock.default = neonMock;
  return neonMock;
});

describe("Treasury network changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.Neon = {
      rpc: {
        RPCClient: class {},
      },
    };
    envState.value = "MainNet";
    fetchPricesMock.mockResolvedValue({ neo: 1, gas: 1 });
    cachedRequestMock.mockResolvedValue([{ name: "Treasury A", address: "Naddr", neo: 1, gas: 2, usdValue: 0 }]);
  });

  it("shows a mainnet-only notice and skips treasury loading on testnet", async () => {
    envState.value = "TestT5";

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

    expect(cachedRequestMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Switch to N3 Mainnet to view live foundation balances.");
    wrapper.unmount();
  });

  it("loads treasury data on mainnet, skips testnet loads, and resumes when switching back", async () => {
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
    expect(cachedRequestMock).toHaveBeenCalledTimes(1);
    expect(cachedRequestMock.mock.calls[0][0]).toBe("MainNet:treasury_data");

    envState.value = "TestT5";
    window.dispatchEvent(new CustomEvent("neo-explorer-network-change", { detail: { env: "TestT5" } }));
    await flushPromises();

    expect(cachedRequestMock).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("Switch to N3 Mainnet to view live foundation balances.");

    envState.value = "MainNet";
    window.dispatchEvent(new CustomEvent("neo-explorer-network-change", { detail: { env: "MainNet" } }));
    await flushPromises();

    expect(cachedRequestMock).toHaveBeenCalledTimes(2);
    expect(cachedRequestMock.mock.calls[1][0]).toBe("MainNet:treasury_data");
    wrapper.unmount();
  });
});
