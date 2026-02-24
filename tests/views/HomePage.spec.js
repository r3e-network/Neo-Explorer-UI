import { defineComponent } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getDashboardStats = vi.fn();
const getBlockList = vi.fn();
const getTxList = vi.fn();
const search = vi.fn();
const fetchPrices = vi.fn();
const startAutoRefresh = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: vi.fn().mockResolvedValue(),
  }),
}));

vi.mock("@/services", () => ({
  statsService: {
    getDashboardStats,
  },
  blockService: {
    getList: getBlockList,
  },
  transactionService: {
    getList: getTxList,
  },
  searchService: {
    search,
  },
}));

vi.mock("@/composables/usePriceCache", () => ({
  usePriceCache: () => ({
    fetchPrices,
  }),
}));

vi.mock("@/composables/useAutoRefresh", () => ({
  useAutoRefresh: () => ({
    start: startAutoRefresh,
  }),
}));

const LatestBlocksStub = defineComponent({
  name: "LatestBlocks",
  props: {
    loading: { type: Boolean, default: false },
  },
  template: '<div data-testid="latest-blocks" :data-loading="String(loading)"></div>',
});

const LatestTransactionsStub = defineComponent({
  name: "LatestTransactions",
  props: {
    loading: { type: Boolean, default: false },
  },
  template: '<div data-testid="latest-txs" :data-loading="String(loading)"></div>',
});

describe("HomePage initial loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDashboardStats.mockResolvedValue({ blocks: 10, txs: 20 });
    getBlockList.mockResolvedValue({
      result: [{ hash: "0xblock", timestamp: Date.now(), txcount: 1 }],
      totalCount: 1,
    });
    getTxList.mockResolvedValue({
      result: [{ hash: "0xtx" }],
      totalCount: 1,
    });
    search.mockResolvedValue(null);
    fetchPrices.mockImplementation(() => new Promise(() => {}));
    startAutoRefresh.mockImplementation(() => {});
  });

  it("shows latest blocks and transactions without waiting for price API", async () => {
    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        stubs: {
          SearchBox: true,
          HomeStats: true,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-loading")).toBe("false");
    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-loading")).toBe("false");
    expect(getBlockList).toHaveBeenCalledWith(6, 0, { forceRefresh: false, enrichMissingFields: false });
    expect(getBlockList.mock.invocationCallOrder[0]).toBeLessThan(getDashboardStats.mock.invocationCallOrder[0]);
    expect(getTxList.mock.invocationCallOrder[0]).toBeLessThan(getDashboardStats.mock.invocationCallOrder[0]);
    wrapper.unmount();
  });

  it("does not block latest blocks rendering on slow transactions response", async () => {
    let resolveTxList;
    getBlockList.mockResolvedValue({
      result: [{ hash: "0xblock", timestamp: Date.now(), txcount: 1 }],
      totalCount: 1,
    });
    getTxList.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTxList = resolve;
        })
    );

    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        stubs: {
          SearchBox: true,
          HomeStats: true,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-loading")).toBe("false");
    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-loading")).toBe("true");

    resolveTxList({
      result: [{ hash: "0xtx" }],
      totalCount: 1,
    });
    await flushPromises();

    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-loading")).toBe("false");
    wrapper.unmount();
  });
});
