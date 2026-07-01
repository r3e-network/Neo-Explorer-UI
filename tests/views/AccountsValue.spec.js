import { flushPromises, mount } from "@vue/test-utils";
import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getListMock = vi.hoisted(() => vi.fn());
const hydrateListBalancesMock = vi.hoisted(() => vi.fn());
const fetchPricesMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/accountService", () => ({
  getAccountListCacheKey: vi.fn(() => "accounts-cache-key"),
  accountService: {
    getList: getListMock,
    hydrateListBalances: hydrateListBalancesMock,
  },
}));

vi.mock("@/services/cache", async (importOriginal) => ({
  ...(await importOriginal()),
  getCache: vi.fn(() => null),
}));

vi.mock("@/composables/usePriceCache", () => ({
  usePriceCache: () => ({
    prices: ref({ neo: 2, gas: 1 }),
    fetchPrices: fetchPricesMock,
  }),
}));

vi.mock("@vueuse/core", () => ({
  useMediaQuery: () => ref(true),
}));

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { page: "1" } }),
  useRouter: () => ({ push: vi.fn(() => Promise.resolve()) }),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key, params) => {
      if (!params || typeof params !== "object") return key;
      return Object.entries(params).reduce(
        (text, [name, value]) => text.replace(new RegExp(`{${name}}`, "g"), String(value)),
        key,
      );
    },
  }),
}));

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key, params) => {
      if (!params || typeof params !== "object") return key;
      return Object.entries(params).reduce(
        (text, [name, value]) => text.replace(new RegExp(`{${name}}`, "g"), String(value)),
        key,
      );
    };
  },
};

describe("Accounts USD value", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getListMock.mockResolvedValue({
      result: [
        {
          address: "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp",
          balancesPending: false,
          balancesUnavailable: false,
          neobalance: "42",
          gasbalance: "1230000000",
          txCount: 5,
          lastTransactionTime: Date.now(),
        },
      ],
      totalCount: 1,
    });
    hydrateListBalancesMock.mockImplementation(async (rows) => rows);
  });

  it("calculates USD value from native token units instead of GAS raw fixed8 units", async () => {
    const Accounts = (await import("@/views/Account/Accounts.vue")).default;
    const wrapper = mount(Accounts, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          Breadcrumb: true,
          EtherscanPagination: true,
          HashLink: { props: ["hash"], template: "<span>{{ hash }}</span>" },
          MobileListCard: true,
          EmptyState: true,
          ErrorState: true,
          Skeleton: true,
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("$96.30");
    expect(wrapper.text()).not.toContain("$1,230,000,084.00");
    wrapper.unmount();
  });

  it("renders a controlled error state without console errors when account loading fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getListMock.mockRejectedValueOnce(new Error("Account overview indexer request failed"));

    const Accounts = (await import("@/views/Account/Accounts.vue")).default;
    const wrapper = mount(Accounts, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          Breadcrumb: true,
          EtherscanPagination: true,
          HashLink: { props: ["hash"], template: "<span>{{ hash }}</span>" },
          MobileListCard: true,
          EmptyState: true,
          ErrorState: {
            props: ["title", "message"],
            template: '<div data-test="accounts-error">{{ title }} {{ message }}</div>',
          },
          Skeleton: true,
        },
      },
    });

    await flushPromises();

    expect(wrapper.find('[data-test="accounts-error"]').text()).toContain("accounts.failedToLoad");
    expect(wrapper.find('[data-test="accounts-error"]').text()).toContain("errors.loadAccounts");
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    wrapper.unmount();
    consoleErrorSpy.mockRestore();
  });
});
