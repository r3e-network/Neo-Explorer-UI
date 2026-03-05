import { defineComponent } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getDashboardStats = vi.fn();
const getBlockList = vi.fn();
const getBlockCount = vi.fn();
const getBlockByHeight = vi.fn();
const getTxsByBlockHeight = vi.fn();
const getTxList = vi.fn();
const getPendingTransactions = vi.fn();
const getNeoTubeBlocks = vi.fn();
const getNeoTubeTxs = vi.fn();
const getNeoTubeStats = vi.fn();
const supportsNeoTubeNetwork = vi.fn();
const search = vi.fn();
const fetchPrices = vi.fn();
const startAutoRefresh = vi.fn();
const loadCommitteeMock = vi.hoisted(() => vi.fn());
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
    getCount: getBlockCount,
    getByHeight: getBlockByHeight,
    getTransactionsByHeight: getTxsByBlockHeight,
  },
  transactionService: {
    getList: getTxList,
    getPendingTransactions,
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

vi.mock("@/composables/useCommittee", () => ({
  useCommittee: () => ({
    loadCommittee: loadCommitteeMock,
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
    blocks: { type: Array, default: () => [] },
  },
  template:
    '<div data-testid="latest-blocks" :data-loading="String(loading)" :data-count="String(blocks.length)" :data-first-txcount="String(blocks?.[0]?.txcount ?? \'undefined\')"></div>',
});

const LatestTransactionsStub = defineComponent({
  name: "LatestTransactions",
  props: {
    loading: { type: Boolean, default: false },
    transactions: { type: Array, default: () => [] },
    transferSummaryByHash: { type: Object, default: () => ({}) },
  },
  template:
    '<div data-testid="latest-txs" :data-loading="String(loading)" :data-count="String(transactions.length)" :data-summary-size="String(Object.keys(transferSummaryByHash || {}).length)"></div>',
});

const HomeStatsStub = defineComponent({
  name: "HomeStats",
  props: {
    blockCount: { type: Number, default: 0 },
  },
  emits: ["fetch-latest"],
  template:
    '<div data-testid="home-stats" :data-block-count="String(blockCount)"><button data-testid="home-stats-fetch" @click="$emit(\'fetch-latest\')">refresh</button></div>',
});

describe("HomePage initial loading", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
    enrichTransactionsMock.mockClear();
    loadCommitteeMock.mockClear();
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
    getBlockCount.mockResolvedValue(10);
    getBlockByHeight.mockResolvedValue({
      hash: "0xblock-by-height",
      index: 9,
      timestamp: Date.now(),
      txcount: 1,
    });
    getTxsByBlockHeight.mockResolvedValue({
      result: [{ hash: "0xtx-by-height", blocktime: Date.now() }],
      totalCount: 1,
    });
    getTxList.mockResolvedValue({
      result: [{ hash: "0xtx" }],
      totalCount: 1,
    });
    getPendingTransactions.mockResolvedValue([]);
    search.mockResolvedValue(null);
    fetchPrices.mockImplementation(() => new Promise(() => { }));
    startAutoRefresh.mockImplementation(() => { });
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
    expect(getBlockList).toHaveBeenCalledWith(6, 0, { forceRefresh: true, enrichMissingFields: false });
    expect(getBlockList.mock.invocationCallOrder[0]).toBeLessThan(getDashboardStats.mock.invocationCallOrder[0]);
    expect(getTxList.mock.invocationCallOrder[0]).toBeLessThan(getDashboardStats.mock.invocationCallOrder[0]);
    wrapper.unmount();
  });

  it("preloads committee metadata on mount to speed validator rendering in latest blocks", async () => {
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

    expect(loadCommitteeMock).toHaveBeenCalledTimes(1);
    expect(loadCommitteeMock).toHaveBeenCalledWith();
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

  it("normalizes latest block transactionCount into txcount for rendering", async () => {
    getBlockList.mockResolvedValueOnce({
      result: [{ hash: "0xblock-camel", index: 123, timestamp: Date.now(), transactionCount: 7 }],
      totalCount: 1,
    });

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

    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-first-txcount")).toBe("7");
    wrapper.unmount();
  });

  it("does not block latest transactions rendering on slow pending-transactions response", async () => {
    let resolvePendingTxs;
    getTxList.mockResolvedValueOnce({
      result: [{ hash: "0xtx-immediate" }],
      totalCount: 1,
    });
    getPendingTransactions.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePendingTxs = resolve;
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

    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-loading")).toBe("false");
    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-count")).toBe("2");

    resolvePendingTxs([{ hash: "0xpending" }]);
    await flushPromises();

    wrapper.unmount();
  });

  it("supplements short transaction list from recent blocks to avoid temporary one-item flashes", async () => {
    getTxList.mockResolvedValueOnce({
      result: [{ hash: "0xonly" }],
      totalCount: 1,
    });
    getBlockCount.mockResolvedValueOnce(2);
    getTxsByBlockHeight.mockResolvedValueOnce({
      result: [
        { hash: "0xonly", blocktime: Date.now() },
        { hash: "0x2", blocktime: Date.now() },
        { hash: "0x3", blocktime: Date.now() },
        { hash: "0x4", blocktime: Date.now() },
        { hash: "0x5", blocktime: Date.now() },
        { hash: "0x6", blocktime: Date.now() },
      ],
      totalCount: 6,
    });

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

    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-count")).toBe("6");
    expect(getTxsByBlockHeight).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("renders short latest transaction list immediately without waiting for fallback block scans", async () => {
    let resolveFallbackScan;
    getTxList.mockResolvedValueOnce({
      result: [{ hash: "0xonly" }],
      totalCount: 1,
    });
    getBlockCount.mockResolvedValueOnce(2);
    getTxsByBlockHeight.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFallbackScan = resolve;
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

    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-loading")).toBe("false");
    expect(Number(wrapper.get('[data-testid="latest-txs"]').attributes("data-count"))).toBeGreaterThan(0);

    resolveFallbackScan({ result: [{ hash: "0xonly" }], totalCount: 1 });
    await flushPromises();
    wrapper.unmount();
  });

  it("prefers RPC endpoints even when NeoTube is available", async () => {
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

    expect(getBlockList).toHaveBeenCalled();
    expect(getTxList).toHaveBeenCalled();
    expect(getDashboardStats).toHaveBeenCalled();
    expect(getNeoTubeBlocks).not.toHaveBeenCalled();
    expect(getNeoTubeTxs).not.toHaveBeenCalled();
    expect(getNeoTubeStats).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("falls back to per-height RPC loaders after latest list RPC failures", async () => {
    supportsNeoTubeNetwork.mockReturnValue(true);
    getBlockList.mockRejectedValueOnce(new Error("rpc blocks unavailable"));
    getTxList.mockRejectedValueOnce(new Error("rpc txs unavailable"));
    getBlockCount.mockResolvedValueOnce(5);
    getBlockByHeight.mockResolvedValueOnce({
      hash: "0xrpc-fallback-block",
      index: 4,
      timestamp: Date.now(),
      txcount: 2,
    });
    getTxsByBlockHeight.mockResolvedValueOnce({
      result: [{ hash: "0xrpc-fallback-tx", blocktime: Date.now() }],
      totalCount: 1,
    });

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

    expect(getBlockList).toHaveBeenCalled();
    expect(getTxList).toHaveBeenCalled();
    expect(getBlockCount).toHaveBeenCalled();
    expect(getBlockByHeight).toHaveBeenCalled();
    expect(getTxsByBlockHeight).toHaveBeenCalled();
    expect(getNeoTubeBlocks).not.toHaveBeenCalled();
    expect(getNeoTubeTxs).not.toHaveBeenCalled();
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

  it("keeps block height aligned to latest block list even when stats endpoint lags", async () => {
    getBlockList.mockResolvedValueOnce({
      result: [{ hash: "0xrpc-block", index: 12345, timestamp: Date.now(), txcount: 1 }],
      totalCount: 1,
    });
    getDashboardStats.mockResolvedValueOnce({ blocks: 10, txs: 20 });

    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        stubs: {
          SearchBox: true,
          HomeStats: HomeStatsStub,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="home-stats"]').attributes("data-block-count")).toBe("12346");
    wrapper.unmount();
  });

  it("updates block height immediately when latest blocks refresh returns a newer height", async () => {
    getBlockList
      .mockResolvedValueOnce({
        result: [{ hash: "0xrpc-block-a", index: 5000, timestamp: Date.now(), txcount: 1 }],
        totalCount: 1,
      })
      .mockResolvedValueOnce({
        result: [{ hash: "0xrpc-block-b", index: 5001, timestamp: Date.now(), txcount: 1 }],
        totalCount: 1,
      });
    getDashboardStats.mockResolvedValue({ blocks: 100, txs: 200 });

    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        stubs: {
          SearchBox: true,
          HomeStats: HomeStatsStub,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();
    expect(wrapper.get('[data-testid="home-stats"]').attributes("data-block-count")).toBe("5001");

    await wrapper.get('[data-testid="home-stats-fetch"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="home-stats"]').attributes("data-block-count")).toBe("5002");
    wrapper.unmount();
  });

  it("keeps previous latest transactions when a refresh returns sparse fallback data", async () => {
    getTxList
      .mockResolvedValueOnce({
        result: [
          { hash: "0xa" },
          { hash: "0xb" },
          { hash: "0xc" },
          { hash: "0xd" },
          { hash: "0xe" },
          { hash: "0xf" },
        ],
        totalCount: 6,
      })
      .mockRejectedValueOnce(new Error("temporary tx list failure"));

    getPendingTransactions
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ hash: "0xpending-only" }]);

    getBlockCount.mockResolvedValueOnce(0);
    getTxsByBlockHeight.mockResolvedValueOnce({ result: [], totalCount: 0 });

    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        stubs: {
          SearchBox: true,
          HomeStats: HomeStatsStub,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();
    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-count")).toBe("6");

    await wrapper.get('[data-testid="home-stats-fetch"]').trigger("click");
    await flushPromises();

    expect(Number(wrapper.get('[data-testid="latest-txs"]').attributes("data-count"))).toBeGreaterThanOrEqual(6);
    wrapper.unmount();
  });

  it("falls back to per-height block and transaction loaders when list RPCs fail and pending tx helper is unavailable", async () => {
    const services = await import("@/services");
    services.transactionService.getPendingTransactions = undefined;

    getBlockList.mockRejectedValueOnce(new Error("list unavailable"));
    getTxList.mockRejectedValueOnce(new Error("tx list unavailable"));
    getBlockCount.mockResolvedValueOnce(12);
    getBlockByHeight.mockResolvedValueOnce({
      hash: "0xblock-fallback",
      index: 11,
      timestamp: Date.now(),
      txcount: 1,
    });
    getTxsByBlockHeight.mockResolvedValueOnce({
      result: [{ hash: "0xtx-fallback", blocktime: Date.now() }],
      totalCount: 1,
    });

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
    expect(Number(wrapper.get('[data-testid="latest-blocks"]').attributes("data-count"))).toBeGreaterThan(0);
    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-loading")).toBe("false");
    expect(Number(wrapper.get('[data-testid="latest-txs"]').attributes("data-count"))).toBeGreaterThan(0);
    expect(getBlockCount).toHaveBeenCalled();
    expect(getBlockByHeight).toHaveBeenCalled();
    expect(getTxsByBlockHeight).toHaveBeenCalled();

    // Restore default for subsequent tests.
    services.transactionService.getPendingTransactions = getPendingTransactions;
    wrapper.unmount();
  });
});
