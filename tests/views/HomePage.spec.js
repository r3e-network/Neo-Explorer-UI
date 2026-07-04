import { defineComponent } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { explorerQueryClient } from "@/query/client";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key) => key,
    locale: { value: "en" },
  }),
}));

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key) => key;
  },
};

const getBlockList = vi.fn();
const getBlockCount = vi.fn();
const getBlockByHeight = vi.fn();
const getBlockTransactionsByHeight = vi.fn();
const getValidatedStateRoot = vi.fn();
const getTxList = vi.fn();
const getIndexerHome = vi.fn();
const getIndexerSummary = vi.fn();
const getIndexerBlocks = vi.fn();
const getIndexerTransactions = vi.fn();
const getNetworkLatestBlocks = vi.fn();
const getDailyAnalytics = vi.fn();
const search = vi.fn();
const fetchPrices = vi.fn();
const startAutoRefresh = vi.fn();
const useRealtimeHeadMock = vi.fn();
const HOMEPAGE_BLOCK_LIMIT = 6;
const HOMEPAGE_TRANSACTION_LIMIT = 6;
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

vi.mock("@/services/blockService", () => ({
  blockService: {
    getList: getBlockList,
    getCount: getBlockCount,
    getByHeight: getBlockByHeight,
    getTransactionsByHeight: getBlockTransactionsByHeight,
    getValidatedStateRoot,
  },
}));

vi.mock("@/services/transactionService", () => ({
  transactionService: {
    getList: getTxList,
  },
}));

vi.mock("@/services/indexerReadService", () => ({
  indexerReadService: {
    getExplorerHome: getIndexerHome,
    getSummary: getIndexerSummary,
    getBlocks: getIndexerBlocks,
    getTransactions: getIndexerTransactions,
  },
}));

vi.mock("@/services/networkMonitorService", () => ({
  getLatestBlocks: getNetworkLatestBlocks,
}));

vi.mock("@/services/searchService", () => ({
  searchService: {
    search,
  },
}));

vi.mock("@/services/statsService", () => ({
  statsService: {
    getDailyAnalytics,
  },
}));

vi.mock("@/composables/usePriceCache", () => ({
  usePriceCache: () => ({
    fetchPrices,
  }),
}));

vi.mock("@/composables/useRealtimeHead", () => ({
  useRealtimeHead: (...args) => {
    useRealtimeHeadMock(...args);
    return {
      start: startAutoRefresh,
      stop: vi.fn(),
      isConnected: { value: false },
    };
  },
}));

vi.mock("@/composables/useCommittee", () => ({
  useCommittee: () => ({
    loadCommittee: loadCommitteeMock,
    getPrimaryNodeName: vi.fn((index) => `Validator ${index}`),
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
    validatedStateRoot: { type: Object, default: null },
  },
  template:
    '<div data-testid="latest-blocks" :data-loading="String(loading)" :data-count="String(blocks.length)" :data-first-hash="String(blocks?.[0]?.hash ?? \'\')" :data-first-index="String(blocks?.[0]?.index ?? \'\')" :data-first-txcount="String(blocks?.[0]?.txcount ?? \'undefined\')" :data-validated-root="String(validatedStateRoot?.validatedrootindex ?? validatedStateRoot?.index ?? \'\')"></div>',
});

const LatestTransactionsStub = defineComponent({
  name: "LatestTransactions",
  props: {
    loading: { type: Boolean, default: false },
    transactions: { type: Array, default: () => [] },
    transferSummaryByHash: { type: Object, default: () => ({}) },
  },
  template:
    '<div data-testid="latest-txs" :data-loading="String(loading)" :data-count="String(transactions.length)" :data-first-hash="String(transactions?.[0]?.hash ?? \'\')" :data-summary-size="String(Object.keys(transferSummaryByHash || {}).length)"></div>',
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

function makeIndexerBlocks(count = HOMEPAGE_BLOCK_LIMIT, startIndex = 12) {
  return {
    data: Array.from({ length: count }, (_, offset) => ({
      hash: `0xidx-block-${startIndex - offset}`,
      block_index: startIndex - offset,
      time_ms: Date.now() - offset * 15000,
      tx_count: offset === 0 ? 2 : 0,
      primary_node: offset % 7,
      next_consensus: "NXZSaAQyqS8aF9t9MPJSUffiK15f1eiwWc",
      sysfee: offset === 0 ? 10 : 0,
      netfee: offset === 0 ? 2 : 0,
    })),
    paging: { total: startIndex + 1 },
  };
}

function makeIndexerTransactions(count = HOMEPAGE_TRANSACTION_LIMIT) {
  return {
    data: Array.from({ length: count }, (_, offset) => ({
      txid: `0xidx-tx-${offset}`,
      block_time_ms: Date.now() - offset * 1000,
      sender_address: `Naddr${offset}`,
      vm_state: "HALT",
    })),
    paging: { total: 999 },
  };
}

function makeFreshSummary(totalBlocks = 13) {
  return {
    network: "mainnet",
    total_block_count: totalBlocks,
    total_tx_count: 999,
    lag_blocks: 0,
    freshness_seconds: 2,
  };
}

function makeBlockTimeRows(count = 14, startHeight = 24) {
  return Array.from({ length: count }, (_, offset) => ({
    height: startHeight - offset,
    interval: offset % 7 === 0 ? 8.25 : 3,
    tx: offset % 3,
    primaryNode: offset % 7,
    nextConsensus: "NXZSaAQyqS8aF9t9MPJSUffiK15f1eiwWc",
  }));
}

describe("HomePage initial loading", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.clearAllMocks();
    enrichTransactionsMock.mockClear();
    loadCommitteeMock.mockClear();
    explorerQueryClient.clear();

    // Default: indexer returns data successfully
    getIndexerHome.mockResolvedValue(null);
    getIndexerSummary.mockResolvedValue(makeFreshSummary());
    getIndexerBlocks.mockResolvedValue(makeIndexerBlocks());
    getIndexerTransactions.mockResolvedValue(makeIndexerTransactions());
    getNetworkLatestBlocks.mockResolvedValue(makeBlockTimeRows());
    getDailyAnalytics.mockResolvedValue([]);

    // Fallback services default to empty (should not be called when indexer works)
    getBlockList.mockResolvedValue({
      result: [{ hash: "0xblock", timestamp: Date.now(), txcount: 1 }],
      totalCount: 1,
    });
    getTxList.mockResolvedValue({
      result: [{ hash: "0xtx" }],
      totalCount: 1,
    });
    getBlockCount.mockResolvedValue(10);
    getBlockByHeight.mockResolvedValue(null);
    getBlockTransactionsByHeight.mockResolvedValue({ result: [], totalCount: 0 });
    getValidatedStateRoot.mockResolvedValue({
      index: 12,
      roothash: "0xstate",
      validated: true,
      localrootindex: 13,
      validatedrootindex: 12,
      lag: 1,
    });
    search.mockResolvedValue(null);
    fetchPrices.mockImplementation(() => new Promise(() => {}));
    startAutoRefresh.mockImplementation(() => {});
    useRealtimeHeadMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders latest blocks and transactions from the indexer", async () => {
    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          SearchBox: true,
          HomeStats: HomeStatsStub,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-loading")).toBe("false");
    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-loading")).toBe("false");
    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-count")).toBe(String(HOMEPAGE_BLOCK_LIMIT));
    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-validated-root")).toBe("12");
    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-count")).toBe(String(HOMEPAGE_TRANSACTION_LIMIT));
    expect(getIndexerBlocks).toHaveBeenCalledWith(HOMEPAGE_BLOCK_LIMIT, 0, expect.objectContaining({ network: "mainnet" }));
    expect(getIndexerTransactions).toHaveBeenCalledWith(
      HOMEPAGE_TRANSACTION_LIMIT,
      0,
      expect.objectContaining({ network: "mainnet" }),
    );
    expect(getIndexerSummary).toHaveBeenCalledWith(expect.objectContaining({ network: "mainnet" }));
    expect(getNetworkLatestBlocks).toHaveBeenCalledWith("mainnet");
    expect(wrapper.get('[data-testid="home-block-time-chart"]').text()).toContain("pages.networkStatus.blockTimeTitle");
    // Should not fall back to RPC when indexer succeeds
    expect(getBlockList).not.toHaveBeenCalled();
    expect(getTxList).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("places the block time chart below the latest blocks and transactions lists", async () => {
    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          SearchBox: true,
          HomeStats: HomeStatsStub,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();

    const blocks = wrapper.get('[data-testid="latest-blocks"]').element;
    const txs = wrapper.get('[data-testid="latest-txs"]').element;
    const chart = wrapper.get('[data-testid="home-block-time-chart"]').element;
    expect(blocks.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(txs.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(wrapper.findAll('[data-testid="home-block-time-chart"] button').length).toBeGreaterThanOrEqual(HOMEPAGE_BLOCK_LIMIT);
    wrapper.unmount();
  });

  it("advances the block time chart from latest blocks before the full chart window resolves", async () => {
    getNetworkLatestBlocks.mockReturnValueOnce(new Promise(() => {}));

    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          SearchBox: true,
          HomeStats: HomeStatsStub,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();

    const labels = wrapper
      .findAll('[data-testid="home-block-time-chart"] button[aria-label]')
      .map((button) => button.attributes("aria-label"));
    expect(labels.length).toBe(HOMEPAGE_BLOCK_LIMIT - 1);
    expect(labels.some((label) => label.startsWith("#12,"))).toBe(true);
    expect(labels.some((label) => label.includes("15s"))).toBe(true);
    expect(labels.every((label) => !label.includes("0s"))).toBe(true);
    wrapper.unmount();
  });

  it("renders latest lists without waiting for the slower summary request", async () => {
    getIndexerSummary.mockReturnValueOnce(new Promise(() => {}));

    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          SearchBox: true,
          HomeStats: HomeStatsStub,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-loading")).toBe("false");
    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-loading")).toBe("false");
    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-count")).toBe(String(HOMEPAGE_BLOCK_LIMIT));
    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-count")).toBe(String(HOMEPAGE_TRANSACTION_LIMIT));
    wrapper.unmount();
  });

  it("renders homepage aggregate payload without per-list read-api requests", async () => {
    getIndexerHome.mockResolvedValueOnce({
      network: "mainnet",
      summary: makeFreshSummary(13),
      latest_blocks: makeIndexerBlocks(HOMEPAGE_TRANSACTION_LIMIT, 12).data,
      latest_transactions: makeIndexerTransactions().data,
      paging: {
        blocks_total: 13,
        transactions_total: 999,
      },
    });

    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          SearchBox: true,
          HomeStats: HomeStatsStub,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-count")).toBe(String(HOMEPAGE_BLOCK_LIMIT));
    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-count")).toBe(String(HOMEPAGE_TRANSACTION_LIMIT));
    expect(wrapper.get('[data-testid="home-stats"]').attributes("data-block-count")).toBe("12");
    expect(getIndexerHome).toHaveBeenCalledWith(HOMEPAGE_TRANSACTION_LIMIT, {
      forceRefresh: false,
      network: "mainnet",
    });
    expect(getDailyAnalytics).toHaveBeenCalledWith(2, { network: "mainnet" });
    expect(getIndexerBlocks).not.toHaveBeenCalled();
    expect(getIndexerTransactions).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("does not let a stale summary hold block count behind a validated state root", async () => {
    getIndexerHome.mockResolvedValueOnce({
      network: "mainnet",
      summary: makeFreshSummary(11),
      latest_blocks: makeIndexerBlocks(6, 10).data,
      latest_transactions: makeIndexerTransactions().data,
      paging: {
        blocks_total: 11,
        transactions_total: 999,
      },
    });
    getValidatedStateRoot.mockResolvedValueOnce({
      index: 12,
      roothash: "0xstate",
      validated: true,
      localrootindex: 13,
      validatedrootindex: 12,
      lag: 1,
    });

    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          SearchBox: true,
          HomeStats: HomeStatsStub,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();
    await flushPromises();

    expect(wrapper.get('[data-testid="home-stats"]').attributes("data-block-count")).toBe("12");
    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-validated-root")).toBe("12");
    wrapper.unmount();
  });

  it("does not hydrate aggregate blocks when zero fee fields are explicit", async () => {
    const blocks = makeIndexerBlocks(6, 12).data.map((block) => ({
      ...block,
      tx_count: 2,
      sysfee: 0,
      netfee: 0,
      next_consensus: "NXZSaAQyqS8aF9t9MPJSUffiK15f1eiwWc",
    }));
    getIndexerHome.mockResolvedValueOnce({
      network: "mainnet",
      summary: makeFreshSummary(13),
      latest_blocks: blocks,
      latest_transactions: makeIndexerTransactions().data,
      paging: {
        blocks_total: 13,
        transactions_total: 999,
      },
    });

    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          SearchBox: true,
          HomeStats: HomeStatsStub,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();
    await flushPromises();

    expect(getBlockByHeight).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("does not hydrate aggregate empty blocks just because fee fields are omitted", async () => {
    const blocks = makeIndexerBlocks(6, 12).data.map((block) => {
      const rest = { ...block };
      delete rest.sysfee;
      delete rest.netfee;
      return {
        ...rest,
        tx_count: 0,
        txcount: 0,
        next_consensus: "NXZSaAQyqS8aF9t9MPJSUffiK15f1eiwWc",
      };
    });
    getIndexerHome.mockResolvedValueOnce({
      network: "mainnet",
      summary: makeFreshSummary(13),
      latest_blocks: blocks,
      latest_transactions: makeIndexerTransactions().data,
      paging: {
        blocks_total: 13,
        transactions_total: 999,
      },
    });

    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          SearchBox: true,
          HomeStats: HomeStatsStub,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();
    await flushPromises();

    expect(getBlockByHeight).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("displays latest block height from the indexer summary count", async () => {
    getIndexerSummary.mockResolvedValueOnce(makeFreshSummary(13));
    getIndexerBlocks.mockResolvedValueOnce(makeIndexerBlocks(6, 12));
    getIndexerTransactions.mockResolvedValueOnce(makeIndexerTransactions());

    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          SearchBox: true,
          HomeStats: HomeStatsStub,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="home-stats"]').attributes("data-block-count")).toBe("12");
    wrapper.unmount();
  });

  it("falls back to blockService.getList when indexer blocks fail", async () => {
    getIndexerBlocks.mockRejectedValueOnce(new Error("indexer down"));
    getIndexerTransactions.mockResolvedValueOnce(makeIndexerTransactions());
    getBlockList.mockResolvedValueOnce({
      result: [
        { hash: "0xrpc-block-1", index: 100, timestamp: Date.now(), txcount: 1 },
        { hash: "0xrpc-block-2", index: 99, timestamp: Date.now() - 15000, txcount: 0 },
      ],
      totalCount: 101,
    });

    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
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
    expect(getBlockList).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("falls back to transactionService.getList when indexer transactions fail", async () => {
    getIndexerBlocks.mockResolvedValueOnce(makeIndexerBlocks());
    getIndexerTransactions.mockRejectedValueOnce(new Error("indexer down"));
    getTxList.mockResolvedValueOnce({
      result: [{ hash: "0xrpc-tx-1" }, { hash: "0xrpc-tx-2" }],
      totalCount: 2,
    });

    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
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
    expect(getTxList).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("falls back to blockService.getList when indexer returns empty blocks", async () => {
    getIndexerBlocks.mockResolvedValueOnce({ data: [], paging: { total: 0 } });
    getBlockList.mockResolvedValueOnce({
      result: [{ hash: "0xrpc-fallback", index: 5, timestamp: Date.now(), txcount: 1 }],
      totalCount: 6,
    });

    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
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
    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-loading")).toBe("false");
    wrapper.unmount();
  });

  it("preloads committee metadata before publishing latest block rows", async () => {
    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          SearchBox: true,
          HomeStats: true,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();

    expect(loadCommitteeMock).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("uses a faster dedicated homepage auto-refresh interval", async () => {
    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          SearchBox: true,
          HomeStats: true,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();

    expect(useRealtimeHeadMock).toHaveBeenCalled();
    expect(useRealtimeHeadMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        intervalMs: 3000,
      }),
    );
    wrapper.unmount();
  });

  it("bypasses the cached homepage aggregate on realtime refreshes", async () => {
    getIndexerHome
      .mockResolvedValueOnce({
        network: "mainnet",
        summary: makeFreshSummary(13),
        latest_blocks: makeIndexerBlocks(6, 12).data,
        latest_transactions: makeIndexerTransactions().data,
        paging: {
          blocks_total: 13,
          transactions_total: 999,
        },
      })
      .mockResolvedValueOnce({
        network: "mainnet",
        summary: makeFreshSummary(14),
        latest_blocks: makeIndexerBlocks(6, 13).data,
        latest_transactions: makeIndexerTransactions().data,
        paging: {
          blocks_total: 14,
          transactions_total: 1000,
        },
      });

    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          SearchBox: true,
          HomeStats: HomeStatsStub,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();

    expect(getIndexerHome).toHaveBeenCalledWith(HOMEPAGE_TRANSACTION_LIMIT, {
      forceRefresh: false,
      network: "mainnet",
    });

    const realtimeCallback = useRealtimeHeadMock.mock.calls[0][0];
    realtimeCallback({ index: 13, network: "mainnet" });
    await flushPromises();

    expect(getIndexerHome).toHaveBeenCalledWith(HOMEPAGE_TRANSACTION_LIMIT, {
      forceRefresh: true,
      network: "mainnet",
    });
    expect(wrapper.get('[data-testid="home-stats"]').attributes("data-block-count")).toBe("13");
    wrapper.unmount();
  });

  it("reconciles realtime refreshes against the RPC tip when the indexer list is behind", async () => {
    getIndexerHome.mockResolvedValue(null);
    getIndexerSummary.mockResolvedValue(makeFreshSummary(13));
    getIndexerBlocks.mockResolvedValue(makeIndexerBlocks(6, 12));
    getIndexerTransactions.mockResolvedValue(makeIndexerTransactions());
    getBlockCount.mockResolvedValue(16);
    getBlockByHeight.mockImplementation(async (height) => ({
      hash: `0xrpc-block-${height}`,
      index: height,
      timestamp: Date.now() - (15 - height) * 3000,
      txcount: height === 15 ? 1 : 0,
      transactioncount: height === 15 ? 1 : 0,
      sysfee: height === 15 ? 0.1 : 0,
      netfee: height === 15 ? 0.01 : 0,
      primary: height % 7,
      nextconsensus: "NXZSaAQyqS8aF9t9MPJSUffiK15f1eiwWc",
      tx: height === 15
        ? [{
            hash: "0xrpc-tx-15",
            vmstate: "HALT",
            sysfee: 0.1,
            netfee: 0.01,
          }]
        : [],
    }));

    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          SearchBox: true,
          HomeStats: HomeStatsStub,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();
    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-first-index")).toBe("12");

    const realtimeCallback = useRealtimeHeadMock.mock.calls[0][0];
    realtimeCallback({ index: 15, network: "mainnet" });
    await flushPromises();
    await flushPromises();

    expect(getBlockCount).toHaveBeenCalledWith(expect.objectContaining({
      forceRefresh: true,
      preferRpc: true,
      network: "mainnet",
    }));
    expect(getBlockByHeight).toHaveBeenCalledWith(
      15,
      expect.objectContaining({ forceRefresh: true, network: "mainnet" }),
    );
    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-first-index")).toBe("15");
    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-first-hash")).toBe("0xrpc-block-15");
    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-first-hash")).toBe("0xrpc-tx-15");
    wrapper.unmount();
  });

  it("passes transfer summaries to LatestTransactions and enriches latest tx rows", async () => {
    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
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
    wrapper.unmount();
  });

  it("keeps previous transactions when a refresh returns empty data", async () => {
    getIndexerTransactions
      .mockResolvedValueOnce(makeIndexerTransactions())
      .mockResolvedValueOnce({ data: [], paging: { total: 0 } });
    getTxList.mockResolvedValueOnce({ result: [], totalCount: 0 });

    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          SearchBox: true,
          HomeStats: HomeStatsStub,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();
    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-count")).toBe(
      String(HOMEPAGE_TRANSACTION_LIMIT),
    );

    // Trigger a refresh
    await wrapper.get('[data-testid="home-stats-fetch"]').trigger("click");
    await flushPromises();

    expect(Number(wrapper.get('[data-testid="latest-txs"]').attributes("data-count"))).toBeGreaterThanOrEqual(6);
    wrapper.unmount();
  });

  it("updates block height when refresh returns a newer height", async () => {
    getIndexerSummary
      .mockResolvedValueOnce(makeFreshSummary(13))
      .mockResolvedValueOnce(makeFreshSummary(14));
    getIndexerBlocks
      .mockResolvedValueOnce(makeIndexerBlocks(6, 12))
      .mockResolvedValueOnce(makeIndexerBlocks(6, 13));
    getIndexerTransactions.mockResolvedValue(makeIndexerTransactions());

    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          SearchBox: true,
          HomeStats: HomeStatsStub,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();
    expect(wrapper.get('[data-testid="home-stats"]').attributes("data-block-count")).toBe("12");

    await wrapper.get('[data-testid="home-stats-fetch"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="home-stats"]').attributes("data-block-count")).toBe("13");
    wrapper.unmount();
  });

  it("shows loading state initially and clears it after data arrives", async () => {
    let resolveBlocks;
    getIndexerBlocks.mockImplementationOnce(
      () => new Promise((resolve) => { resolveBlocks = resolve; }),
    );

    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          SearchBox: true,
          HomeStats: true,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    // Before data resolves, blocks should still be loading
    await flushPromises();
    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-loading")).toBe("true");

    resolveBlocks(makeIndexerBlocks());
    await flushPromises();

    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-loading")).toBe("false");
    wrapper.unmount();
  });

  it("keeps latest blocks visible during a background realtime refresh", async () => {
    getIndexerHome.mockResolvedValue(null);
    let resolveSecondBlocks;
    getIndexerBlocks
      .mockResolvedValueOnce(makeIndexerBlocks(6, 12))
      .mockImplementationOnce(
        () => new Promise((resolve) => { resolveSecondBlocks = resolve; }),
      );

    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          SearchBox: true,
          HomeStats: true,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();
    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-count")).toBe("6");
    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-loading")).toBe("false");

    const realtimeCallback = useRealtimeHeadMock.mock.calls[0][0];
    realtimeCallback({ index: 13, network: "mainnet" });
    await flushPromises();

    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-count")).toBe("6");
    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-loading")).toBe("false");

    resolveSecondBlocks(makeIndexerBlocks(6, 13));
    await flushPromises();

    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-loading")).toBe("false");
    wrapper.unmount();
  });

  it("handles both indexer and RPC fallback failing gracefully", async () => {
    getIndexerBlocks.mockRejectedValueOnce(new Error("indexer down"));
    getIndexerTransactions.mockRejectedValueOnce(new Error("indexer down"));
    getBlockList.mockRejectedValueOnce(new Error("rpc down"));
    getTxList.mockRejectedValueOnce(new Error("rpc down"));

    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    const wrapper = mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          SearchBox: true,
          HomeStats: true,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });

    await flushPromises();

    // Should not crash — loading should be cleared
    expect(wrapper.get('[data-testid="latest-blocks"]').attributes("data-loading")).toBe("false");
    expect(wrapper.get('[data-testid="latest-txs"]').attributes("data-loading")).toBe("false");
    wrapper.unmount();
  });

  // Stub that surfaces the headline stats HomePage binds so display-source /
  // stale-retention / loading assertions can read them.
  const StatsStub = defineComponent({
    name: "HomeStats",
    props: {
      blockCount: { type: Number, default: 0 },
      txCount: { type: Number, default: 0 },
      loading: { type: Boolean, default: false },
    },
    emits: ["fetch-latest"],
    template:
      '<div data-testid="home-stats" :data-block-count="String(blockCount)" :data-tx-count="String(txCount)" :data-loading="String(loading)"><button data-testid="home-stats-fetch" @click="$emit(\'fetch-latest\')">refresh</button></div>',
  });

  const mountWithStatsStub = async () => {
    const HomePage = (await import("@/views/Home/HomePage.vue")).default;
    return mount(HomePage, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          SearchBox: true,
          HomeStats: StatsStub,
          LatestBlocks: LatestBlocksStub,
          LatestTransactions: LatestTransactionsStub,
        },
      },
    });
  };

  it("renders the internal indexed_tx_count for the headline, not the external total (#16)", async () => {
    // Summary carries a large external chain-wide total_tx_count but a smaller
    // internal indexed_tx_count. The headline must show the internal count so
    // it agrees with the Transactions-page header and never shrinks/rebounds.
    getIndexerHome.mockResolvedValue(null);
    getIndexerSummary.mockResolvedValue({
      network: "mainnet",
      total_block_count: 13,
      total_tx_count: 250_000_000,
      indexed_tx_count: 3_000_000,
      lag_blocks: 0,
      freshness_seconds: 2,
    });

    const wrapper = await mountWithStatsStub();
    await flushPromises();

    expect(wrapper.get('[data-testid="home-stats"]').attributes("data-tx-count")).toBe("3000000");
    wrapper.unmount();
  });

  it("binds a summary-pending loading flag to HomeStats and clears it once the summary settles (#22)", async () => {
    let resolveSummary;
    getIndexerHome.mockResolvedValue(null);
    getIndexerSummary.mockImplementationOnce(
      () => new Promise((resolve) => { resolveSummary = resolve; }),
    );

    const wrapper = await mountWithStatsStub();
    await flushPromises();

    // Summary still in flight — HomeStats loading must be true so its skeletons
    // are reachable instead of painting a premature 0.
    expect(wrapper.get('[data-testid="home-stats"]').attributes("data-loading")).toBe("true");

    resolveSummary({
      network: "mainnet",
      total_block_count: 13,
      total_tx_count: 999,
      indexed_tx_count: 999,
      lag_blocks: 0,
      freshness_seconds: 2,
    });
    await flushPromises();

    expect(wrapper.get('[data-testid="home-stats"]').attributes("data-loading")).toBe("false");
    wrapper.unmount();
  });

  it("keeps a stale summary's tx count instead of rendering 0 indefinitely (#22)", async () => {
    // Summary fails the freshness gate (large lag). Rather than discard it into
    // a permanent 0, HomePage adopts its indexed count as a last-known value.
    getIndexerHome.mockResolvedValue(null);
    getIndexerSummary.mockResolvedValue({
      network: "mainnet",
      total_block_count: 13,
      total_tx_count: 4_000_000,
      indexed_tx_count: 3_500_000,
      lag_blocks: 50,
      freshness_seconds: 600,
    });

    const wrapper = await mountWithStatsStub();
    await flushPromises();

    expect(wrapper.get('[data-testid="home-stats"]').attributes("data-tx-count")).toBe("3500000");
    expect(wrapper.get('[data-testid="home-stats"]').attributes("data-loading")).toBe("false");
    wrapper.unmount();
  });
});
