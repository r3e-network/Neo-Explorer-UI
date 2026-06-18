import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const route = { params: { hash: "100" } };
const push = vi.fn(() => Promise.resolve());
const getByHeight = vi.fn();
const getByHash = vi.fn();
const getInfoByHash = vi.fn();
const getStateRoot = vi.fn();
const getCount = vi.fn();
const getTransactionsByHash = vi.fn();
const getTransactionsByHeight = vi.fn();
const getEnrichedBlockTrace = vi.fn();
const getBlockApplicationLog = vi.fn();

vi.mock("vue-router", () => ({
  useRoute: () => route,
  useRouter: () => ({ push }),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key, params) => (params?.n !== undefined ? `${key}:${params.n}` : key),
  }),
}));

vi.mock("@/services/blockService", () => ({
  blockService: {
    getByHeight,
    getByHash,
    getInfoByHash,
    getStateRoot,
    getCount,
    getTransactionsByHash,
    getTransactionsByHeight,
  },
}));

vi.mock("@/services/executionService", () => ({
  executionService: {
    getEnrichedBlockTrace,
    getBlockApplicationLog,
  },
}));

vi.mock("@/composables/useNetworkChange", () => ({
  useNetworkChange: vi.fn(),
}));

describe("BlockDetail data loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.params.hash = "100";
    getByHeight.mockResolvedValue({
      hash: "0xheight",
      index: 100,
      timestamp: 1710000000000,
      tx: [],
      txcount: 0,
      transactioncount: 0,
      size: 697,
    });
    getByHash.mockResolvedValue(null);
    getInfoByHash.mockResolvedValue(null);
    getStateRoot.mockResolvedValue("0xstate");
    getCount.mockResolvedValue(101);
    getTransactionsByHash.mockResolvedValue({ result: [], totalCount: 0 });
    getTransactionsByHeight.mockResolvedValue({ result: [], totalCount: 0 });
    getEnrichedBlockTrace.mockResolvedValue(null);
    getBlockApplicationLog.mockResolvedValue(null);
  });

  it("uses a numeric height response as the main detail payload without duplicate hash fetches", async () => {
    const BlockDetail = (await import("@/views/Block/BlockDetail.vue")).default;
    mount(BlockDetail, {
      global: {
        mocks: {
          $t: (key, params) => (params?.n !== undefined ? `${key}:${params.n}` : key),
        },
        stubs: {
          Breadcrumb: true,
          BlockHeader: { template: '<header data-testid="block-header">{{ block.index }}</header>', props: ["block"] },
          BlockOverview: true,
          TabsNav: true,
          BlockTransactionsInline: true,
          BlockLogsInline: true,
          Skeleton: true,
          ErrorState: true,
        },
      },
    });

    await flushPromises();
    await flushPromises();

    expect(getByHeight).toHaveBeenCalledWith(100, { forceRefresh: false });
    expect(getByHash).not.toHaveBeenCalled();
    expect(getInfoByHash).not.toHaveBeenCalled();
  });

  it("does not request a transaction list when verbose block data already proves the block is empty", async () => {
    const BlockDetail = (await import("@/views/Block/BlockDetail.vue")).default;
    mount(BlockDetail, {
      global: {
        mocks: {
          $t: (key, params) => (params?.n !== undefined ? `${key}:${params.n}` : key),
        },
        stubs: {
          Breadcrumb: true,
          BlockHeader: true,
          BlockOverview: true,
          TabsNav: true,
          BlockTransactionsInline: true,
          BlockLogsInline: true,
          Skeleton: true,
          ErrorState: true,
        },
      },
    });

    await flushPromises();
    await flushPromises();

    expect(getTransactionsByHash).not.toHaveBeenCalled();
    expect(getTransactionsByHeight).not.toHaveBeenCalled();
  });
});
