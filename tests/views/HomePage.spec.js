import { defineComponent } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getDashboardStats = vi.fn();
const getBlockList = vi.fn();
const getTxList = vi.fn();
const getNeoTubeBlocks = vi.fn();
const getNeoTubeTxs = vi.fn();
const getNeoTubeStats = vi.fn();
const supportsNeoTubeNetwork = vi.fn();
const search = vi.fn();
const fetchPrices = vi.fn();
const startAutoRefresh = vi.fn();
const { enrichTransactionsMock, transferSummaryByHashMock } = vi.hoisted(() => ({
  enrichTransactionsMock: vi.fn(),
  transferSummaryByHashMock: {
    "0xtx": {
      text: "1 GAS",
      contract: "0xd2a4cff31913016155e38e474a2c06d08be276cf",
      type: "NEP17",
    },
  },
}));

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
  neotubeService: {
    supportsNetwork: supportsNeoTubeNetwork,
    getLatestBlocks: getNeoTubeBlocks,
    getLatestTransactions: getNeoTubeTxs,
    getStatistics: getNeoTubeStats,
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

vi.mock("@/composables/useTransferSummary", () => ({
  useTransferSummary: () => ({
    transferSummaryByHash: transferSummaryByHashMock,
    enrichTransactions: enrichTransactionsMock,
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
    transferSummaryByHash: { type: Object, default: () => ({}) },
  },
  template:
    '<div data-testid="latest-txs" :data-loading="String(loading)" :data-summary-size="String(Object.keys(transferSummaryByHash || {}).length)"></div>',
});

describe("HomePage initial loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enrichTransactionsMock.mockClear();
    supportsNeoTubeNetwork.mockReturnValue(false);
    getNeoTubeBlocks.mockResolvedValue({
      result: [{ hash: "0xneo-block", timestamp: Date.now(), txcount: 1 }],
      totalCount: 1,
    });
    getNeoTubeTxs.mockResolvedValue({
      result: [{ hash: "0xneo-tx" }],
      totalCount: 1,
    });
    getNeoTubeStats.mockResolvedValue({ blocks: 100, txs: 200 });
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

  it("prefers NeoTube endpoints on supported networks", async () => {
    supportsNeoTubeNetwork.mockReturnValue(true);

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

    expect(getNeoTubeBlocks).toHaveBeenCalled();
    expect(getNeoTubeTxs).toHaveBeenCalled();
    expect(getNeoTubeStats).toHaveBeenCalled();
    expect(getBlockList).not.toHaveBeenCalled();
    expect(getTxList).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("falls back to RPC dashboard stats when NeoTube returns zero block/tx counts", async () => {
    supportsNeoTubeNetwork.mockReturnValue(true);
    getNeoTubeStats.mockResolvedValueOnce({ blocks: 0, txs: 0 });
    getDashboardStats.mockResolvedValueOnce({ blocks: 111, txs: 222 });

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

    expect(getNeoTubeStats).toHaveBeenCalled();
    expect(getDashboardStats).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("passes transfer summaries to LatestTransactions and enriches latest tx rows", async () => {
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

    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-summary-size")).toBe("1");
    expect(enrichTransactionsMock).toHaveBeenCalled();
    expect(enrichTransactionsMock.mock.calls[0][0]).toEqual([{ hash: "0xtx" }]);
    wrapper.unmount();
  });
});
