// XBlockDetail parallel header + tx-list fetch.
//
// The block header and its transaction list are independent requests (both
// keyed only on the route param). load() must dispatch them together via
// Promise.allSettled so the tx list does not wait on the header fetch plus its
// consensus RPC hop, while still isolating a tx-list failure from the header
// and discarding the tx result on a 404.
import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import XBlockDetail from "@/views/X/XBlockDetail.vue";

const WELL_FORMED_HASH = `0x${"b".repeat(64)}`;

const route = { params: { hash: WELL_FORMED_HASH } };
const getByParam = vi.fn();
const getBlockTransactions = vi.fn();

vi.mock("vue-router", () => ({
  useRoute: () => route,
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

vi.mock("@/services/neox", () => ({
  blockService: {
    getByParam: (...args) => getByParam(...args),
    getBlockTransactions: (...args) => getBlockTransactions(...args),
  },
}));

vi.mock("@/utils/neoxEnv", () => ({
  getNeoxNet: () => "mainnet",
}));

vi.mock("@/composables/useNetworkChange", () => ({
  useNetworkChange: () => {},
}));

vi.mock("@/utils/neoxAntiMev", () => ({
  getNeoxBlockProtection: () => ({ active: false }),
}));

const sampleBlock = {
  index: 42,
  hash: WELL_FORMED_HASH,
  timestampMs: Date.now(),
  txCount: 1,
};

function mountView() {
  return mount(XBlockDetail, {
    global: {
      stubs: {
        Breadcrumb: true,
        Skeleton: true,
        ErrorState: true,
        EmptyState: true,
        InfoRow: true,
        CopyButton: true,
        DashboardStatCard: true,
        XHashLink: true,
        XTxTable: true,
        RouterLink: { template: "<a><slot /></a>" },
      },
    },
  });
}

describe("XBlockDetail parallel fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.params.hash = WELL_FORMED_HASH;
    getByParam.mockResolvedValue(sampleBlock);
    getBlockTransactions.mockResolvedValue({ items: [] });
  });

  it("dispatches the tx-list request without awaiting the header", async () => {
    // Header stays in-flight; the tx-list request must already have been made.
    let resolveHeader;
    getByParam.mockImplementationOnce(
      () => new Promise((resolve) => (resolveHeader = resolve)),
    );

    const wrapper = mountView();
    await Promise.resolve();

    expect(getByParam).toHaveBeenCalledTimes(1);
    expect(getBlockTransactions).toHaveBeenCalledTimes(1);

    resolveHeader(sampleBlock);
    await flushPromises();
    wrapper.unmount();
  });

  it("renders the block and tx table once both requests resolve", async () => {
    getBlockTransactions.mockResolvedValueOnce({ items: [{ hash: "0x1" }] });
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find("h1.page-title").exists()).toBe(true);
    expect(wrapper.find("error-state-stub").exists()).toBe(false);
    expect(wrapper.find("empty-state-stub").exists()).toBe(false);
    wrapper.unmount();
  });

  it("keeps the block visible when only the tx-list request fails", async () => {
    getBlockTransactions.mockRejectedValueOnce(new Error("tx upstream down"));
    const wrapper = mountView();
    await flushPromises();

    // Header still rendered; the failure is isolated to the tx section, which
    // surfaces the unavailable message through the tx table's empty prop.
    expect(wrapper.find("h1.page-title").exists()).toBe(true);
    expect(wrapper.find("error-state-stub").exists()).toBe(false);
    expect(wrapper.find("x-tx-table-stub").attributes("empty")).toBe(
      "Transaction list temporarily unavailable",
    );
    wrapper.unmount();
  });

  it("shows not-found and discards the tx result when the header 404s", async () => {
    getByParam.mockResolvedValueOnce(null);
    getBlockTransactions.mockResolvedValueOnce({ items: [{ hash: "0x1" }] });
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find("empty-state-stub").exists()).toBe(true);
    expect(wrapper.find("h1.page-title").exists()).toBe(false);
    wrapper.unmount();
  });

  it("surfaces the error state when the header request rejects", async () => {
    getByParam.mockRejectedValueOnce(new Error("transport failure"));
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find("error-state-stub").exists()).toBe(true);
    expect(wrapper.find("h1.page-title").exists()).toBe(false);
    wrapper.unmount();
  });
});
