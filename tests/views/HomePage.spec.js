import { defineComponent } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
const getIndexerSummary = vi.fn();
const getIndexerBlocks = vi.fn();
const getIndexerTransactions = vi.fn();
const search = vi.fn();
const fetchPrices = vi.fn();
const startAutoRefresh = vi.fn();
const useAutoRefreshMock = vi.fn();
const getLatestHomepageSnapshotMock = vi.fn();
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
  indexerReadService: {
    getSummary: getIndexerSummary,
    getBlocks: getIndexerBlocks,
    getTransactions: getIndexerTransactions,
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
  useAutoRefresh: (...args) => {
    useAutoRefreshMock(...args);
    return {
      start: startAutoRefresh,
    };
  },
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

vi.mock("@/services/liveHomepageService", () => ({
  getLatestHomepageSnapshot: getLatestHomepageSnapshotMock,
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
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
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
    getIndexerSummary.mockResolvedValue(null);
    getIndexerBlocks.mockResolvedValue(null);
    getIndexerTransactions.mockResolvedValue(null);
    getDashboardStats.mockResolvedValue({ blocks: 10, txs: 20 });
    getBlockList.mockResolvedValue({
      result: [{ hash: "0xblock", timestamp: Date.now(), txcount: 1 }],
      totalCount: 1,
    });
    getBlockCount.mockResolvedValue(10);
    getBlockByHeight.mockImplementation(async (height) => ({
      hash: `0xblock-by-height-${height}`,
      index: height,
      timestamp: Date.now() - Math.max(0, 9 - Number(height || 0)) * 15000,
      txcount: Number(height) === 9 ? 1 : 0,
    }));
    getTxsByBlockHeight.mockImplementation(async (height) => ({
      result: Number(height) === 9 ? [{ hash: "0xtx-by-height", blocktime: Date.now() }] : [],
      totalCount: Number(height) === 9 ? 1 : 0,
    }));
    getTxList.mockResolvedValue({
      result: [{ hash: "0xtx" }],
      totalCount: 1,
    });
    getPendingTransactions.mockResolvedValue([]);
    search.mockResolvedValue(null);
    fetchPrices.mockImplementation(() => new Promise(() => { }));
    startAutoRefresh.mockImplementation(() => { });
    useAutoRefreshMock.mockClear();
    getLatestHomepageSnapshotMock.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(getBlockCount).toHaveBeenCalled();
    expect(getBlockByHeight).toHaveBeenCalled();
    expect(getTxsByBlockHeight).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("prefers indexed latest block and transaction lists when the summary is fresh", async () => {
    getIndexerSummary.mockResolvedValueOnce({
      network: "mainnet",
      total_block_count: 13,
      total_tx_count: 999,
      lag_blocks: 0,
      freshness_seconds: 2,
    });
    getIndexerBlocks.mockResolvedValueOnce({
      data: Array.from({ length: 6 }, (_, offset) => ({
        hash: `0xidx-block-${12 - offset}`,
        block_index: 12 - offset,
        time_ms: Date.now() - offset * 15000,
        tx_count: offset === 0 ? 2 : 0,
        primary_node: offset % 7,
        next_consensus: "NXZSaAQyqS8aF9t9MPJSUffiK15f1eiwWc",
        sysfee: offset === 0 ? 10 : 0,
        netfee: offset === 0 ? 2 : 0,
      })),
      paging: { total: 13 },
    });
    getIndexerTransactions.mockResolvedValueOnce({
      data: Array.from({ length: 6 }, (_, offset) => ({
        txid: `0xidx-tx-${offset}`,
        block_time_ms: Date.now() - offset * 1000,
        sender_address: `Naddr${offset}`,
        vm_state: "HALT",
      })),
      paging: { total: 999 },
    });

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

    expect(getIndexerTransactions).toHaveBeenCalled();
    expect(getIndexerBlocks).toHaveBeenCalled();
    expect(getBlockCount).not.toHaveBeenCalled();
    expect(getBlockByHeight).not.toHaveBeenCalled();
    expect(getTxsByBlockHeight).not.toHaveBeenCalled();
    expect(getBlockList).not.toHaveBeenCalled();
    expect(getTxList).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-count")).toBe("6");
    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-count")).toBe("6");
    expect(wrapper.get('[data-testid="home-stats"]').attributes("data-block-count")).toBe("13");

    wrapper.unmount();
  });

  it("supplements stale indexed latest blocks with direct height fetches when the indexer head lags the live chain", async () => {
    getIndexerSummary.mockResolvedValueOnce({
      network: "mainnet",
      total_block_count: 101,
      total_tx_count: 999,
      lag_blocks: 3,
      freshness_seconds: 60,
    });
    getBlockCount.mockResolvedValueOnce(103);
    getBlockByHeight
      .mockResolvedValueOnce({ hash: "0xrpc-102", index: 102, timestamp: Date.now(), txcount: 1 })
      .mockResolvedValueOnce({ hash: "0xrpc-101", index: 101, timestamp: Date.now(), txcount: 0 })
      .mockResolvedValueOnce({ hash: "0xrpc-100", index: 100, timestamp: Date.now(), txcount: 1 });

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

    expect(getIndexerBlocks).not.toHaveBeenCalled();
    expect(getBlockCount).toHaveBeenCalled();
    expect(getBlockByHeight).toHaveBeenCalled();
    expect(wrapper.get('[data-testid="home-stats"]').attributes("data-block-count")).toBe("103");
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
    let resolveTxsByBlockHeight;
    getTxsByBlockHeight.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveTxsByBlockHeight = resolve;
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

    resolveTxsByBlockHeight({
      result: [{ hash: "0xtx" }],
      totalCount: 1,
    });
    await flushPromises();

    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-loading")).toBe("false");
    wrapper.unmount();
  });

  it("does not wait for the slow live homepage snapshot before rendering latest blocks", async () => {
    getLatestHomepageSnapshotMock.mockImplementationOnce(() => new Promise(() => {}));
    getBlockCount.mockResolvedValueOnce(12);
    getBlockByHeight
      .mockResolvedValueOnce({ hash: "0xblock-11", index: 11, timestamp: Date.now(), txcount: 1 })
      .mockResolvedValueOnce({ hash: "0xblock-10", index: 10, timestamp: Date.now() - 15000, txcount: 0 })
      .mockResolvedValueOnce({ hash: "0xblock-9", index: 9, timestamp: Date.now() - 30000, txcount: 0 })
      .mockResolvedValueOnce({ hash: "0xblock-8", index: 8, timestamp: Date.now() - 45000, txcount: 0 })
      .mockResolvedValueOnce({ hash: "0xblock-7", index: 7, timestamp: Date.now() - 60000, txcount: 0 })
      .mockResolvedValueOnce({ hash: "0xblock-6", index: 6, timestamp: Date.now() - 75000, txcount: 0 });

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
    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-count")).toBe("6");
    wrapper.unmount();
  });

  it("normalizes latest block transactionCount into txcount for rendering", async () => {
    getBlockCount.mockResolvedValueOnce(124);
    getBlockByHeight
      .mockResolvedValueOnce({ hash: "0xblock-camel", index: 123, timestamp: Date.now(), transactionCount: 7 })
      .mockResolvedValue({ hash: "0xolder-block", index: 122, timestamp: Date.now() - 15000, txcount: 0 });

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

  it("does not consult pending-transactions for the homepage latest confirmed transaction list", async () => {
    getTxList.mockResolvedValueOnce({
      result: [{ hash: "0xtx-immediate" }],
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

    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-loading")).toBe("false");
    expect(getPendingTransactions).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it("does not merge pending transactions into the homepage latest confirmed transaction list", async () => {
    getTxList.mockResolvedValueOnce({
      result: [{ hash: "0xconfirmed" }],
      totalCount: 1,
    });
    getPendingTransactions.mockResolvedValueOnce([{ hash: "0xpending" }]);
    getBlockCount.mockResolvedValueOnce(0);
    getTxsByBlockHeight.mockResolvedValueOnce({ result: [], totalCount: 0 });

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

    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-count")).toBe("1");
    expect(getPendingTransactions).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("uses a faster dedicated homepage auto-refresh interval", async () => {
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

    expect(useAutoRefreshMock).toHaveBeenCalled();
    expect(useAutoRefreshMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        intervalMs: 5000,
      }),
    );
    wrapper.unmount();
  });

  it("supplements short transaction list from recent blocks to avoid temporary one-item flashes", async () => {
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

  it("keeps backfilling latest transactions when one height lookup in the batch fails", async () => {
    getLatestHomepageSnapshotMock.mockResolvedValueOnce({
      blocks: [
        { hash: "0xblock-9", index: 9, timestamp: Date.now(), txcount: 1 },
        { hash: "0xblock-8", index: 8, timestamp: Date.now() - 15000, txcount: 3 },
        { hash: "0xblock-7", index: 7, timestamp: Date.now() - 30000, txcount: 3 },
      ],
      transactions: [{ hash: "0xlive-only", blocktime: Date.now(), status: "success" }],
    });
    getBlockCount.mockResolvedValueOnce(10);
    getTxsByBlockHeight.mockImplementation(async (height) => {
      if (Number(height) === 9) {
        throw new Error("transient block tx fetch failure");
      }
      if (Number(height) === 8) {
        return {
          result: [
            { hash: "0x8-1", blocktime: Date.now() - 15000, status: "success" },
            { hash: "0x8-2", blocktime: Date.now() - 15000, status: "success" },
            { hash: "0x8-3", blocktime: Date.now() - 15000, status: "success" },
          ],
          totalCount: 3,
        };
      }
      if (Number(height) === 7) {
        return {
          result: [
            { hash: "0x7-1", blocktime: Date.now() - 30000, status: "success" },
            { hash: "0x7-2", blocktime: Date.now() - 30000, status: "success" },
            { hash: "0x7-3", blocktime: Date.now() - 30000, status: "success" },
          ],
          totalCount: 3,
        };
      }
      return { result: [], totalCount: 0 };
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
    await flushPromises();

    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-count")).toBe("6");
    wrapper.unmount();
  });

  it("does not paint a sparse latest transaction list before initial backfill completes", async () => {
    let resolveFallbackScan;
    getIndexerTransactions.mockResolvedValueOnce({
      data: [{ txid: "0xonly", block_time_ms: Date.now(), sender_address: "Naddr" }],
      paging: { total: 1 },
    });
    getTxList.mockResolvedValueOnce({ result: [], totalCount: 0 });
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

    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-loading")).toBe("true");
    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-count")).toBe("0");

    resolveFallbackScan({
      result: [
        { hash: "0xonly", blocktime: Date.now() },
        { hash: "0x2", blocktime: Date.now() - 1000 },
        { hash: "0x3", blocktime: Date.now() - 2000 },
        { hash: "0x4", blocktime: Date.now() - 3000 },
        { hash: "0x5", blocktime: Date.now() - 4000 },
        { hash: "0x6", blocktime: Date.now() - 5000 },
      ],
      totalCount: 6,
    });
    await flushPromises();
    await flushPromises();

    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-loading")).toBe("false");
    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-count")).toBe("6");
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

    expect(getBlockCount).toHaveBeenCalled();
    expect(getBlockByHeight).toHaveBeenCalled();
    expect(getTxsByBlockHeight).toHaveBeenCalled();
    expect(getNeoTubeBlocks).not.toHaveBeenCalled();
    expect(getNeoTubeTxs).not.toHaveBeenCalled();
    expect(getNeoTubeStats).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("falls back to per-height RPC loaders after latest list RPC failures", async () => {
    supportsNeoTubeNetwork.mockReturnValue(true);
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
    expect(enrichTransactionsMock.mock.calls[0][0]).toEqual([
      { hash: "0xtx-by-height", blocktime: expect.any(Number) },
      { hash: "0xtx" },
    ]);
    wrapper.unmount();
  });

  it("keeps block height aligned to latest block list even when stats endpoint lags", async () => {
    getBlockCount.mockResolvedValueOnce(12346);
    getBlockByHeight.mockResolvedValueOnce({
      hash: "0xrpc-block",
      index: 12345,
      timestamp: Date.now(),
      txcount: 1,
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
    getBlockCount
      .mockResolvedValueOnce(5001)
      .mockResolvedValueOnce(5002);
    getBlockByHeight
      .mockResolvedValueOnce({
        hash: "0xrpc-block-a",
        index: 5000,
        timestamp: Date.now(),
        txcount: 1,
      })
      .mockResolvedValueOnce({
        hash: "0xrpc-block-b",
        index: 5001,
        timestamp: Date.now(),
        txcount: 1,
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
