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

const safeRpcMock = vi.hoisted(() => vi.fn());

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

vi.mock("@/services/api", () => ({
  safeRpc: safeRpcMock,
}));

describe("Treasury view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })));
    safeRpcMock.mockResolvedValue({
      balance: [
        { assethash: "0xneo", amount: "12" },
        { assethash: "0xgas", amount: "150000000" },
      ],
    });
  });

  it("loads treasury balances from the indexed read-api without RPC fan-out", async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes("/rest/v1/v_nep17_balances")) {
        return new Response(JSON.stringify([
          { address: "NtestTreasuryAddress", contract_hash: "0xneo", balance_raw: "12" },
          { address: "NtestTreasuryAddress", contract_hash: "0xgas", balance_raw: "150000000" },
        ]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: { protocol: { network: 860833102 } },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

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

    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/rest\/v1\/v_nep17_balances\?.*select=address%2Ccontract_hash%2Cbalance_raw/),
      expect.objectContaining({
        headers: { Accept: "application/json" },
      }),
    );
    expect(safeRpcMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("12");
    expect(wrapper.text()).toContain("1.5");
  });

  it("falls back to standard getnep17balances RPC when the read-api is unavailable", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 500 }));

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

    expect(safeRpcMock).toHaveBeenCalledWith(
      "getnep17balances",
      ["NtestTreasuryAddress"],
      null,
      { throwOnError: true },
    );
    expect(wrapper.text()).toContain("12");
    expect(wrapper.text()).toContain("1.5");
  });
});
