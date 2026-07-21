// XTxDetail bounded pending-poll state machine.
//
// A well-formed hash that resolves to null (no transport error) is polled
// every 5s for at most 12 attempts before the static not-found state takes
// over; malformed hashes skip the poll entirely; unmount must kill the chain
// even when a poll fetch is mid-flight.
import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import XTxDetail from "@/views/X/XTxDetail.vue";

const WELL_FORMED_HASH = `0x${"a".repeat(64)}`;
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 12;

const route = { params: { txhash: WELL_FORMED_HASH } };
const getByHash = vi.fn();

vi.mock("vue-router", () => ({
  useRoute: () => route,
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

vi.mock("@/services/neox", () => ({
  transactionService: {
    getByHash: (...args) => getByHash(...args),
  },
}));

vi.mock("@/utils/neoxEnv", () => ({
  getNeoxNet: () => "mainnet",
}));

function mountView() {
  return mount(XTxDetail, {
    global: {
      stubs: {
        Breadcrumb: true,
        Skeleton: true,
        ErrorState: true,
        EmptyState: true,
        TabsNav: true,
        InfoRow: true,
        CopyButton: true,
        StatusBadge: true,
        TokenAvatar: true,
        XHashLink: true,
        XDecodedInput: true,
        XTxLogsTab: true,
        XTxInternalTab: true,
        XTxStateTab: true,
        XTxRawTab: true,
        XAntiMevBadge: true,
        RouterLink: { template: "<a><slot /></a>" },
      },
    },
  });
}

async function advanceOnePoll() {
  await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
  await flushPromises();
}

describe("XTxDetail pending poll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    route.params.txhash = WELL_FORMED_HASH;
    getByHash.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("polls a well-formed unknown hash every 5s and shows the pending panel", async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(getByHash).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("Transaction not found yet");
    expect(wrapper.text()).toContain(`1/${MAX_POLL_ATTEMPTS}`);
    // The ticking attempt counter stays outside the live region so each 5s
    // tick is not re-announced by screen readers.
    expect(wrapper.find('[role="status"]').text()).not.toContain(`1/${MAX_POLL_ATTEMPTS}`);

    await advanceOnePoll();
    expect(getByHash).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain(`2/${MAX_POLL_ATTEMPTS}`);
    wrapper.unmount();
  });

  it("declares not found inside a live region once the poll budget is exhausted", async () => {
    const wrapper = mountView();
    await flushPromises();

    for (let i = 0; i < MAX_POLL_ATTEMPTS; i += 1) {
      await advanceOnePoll();
    }

    // Initial load + 12 poll attempts, then the chain stops for good.
    expect(getByHash).toHaveBeenCalledTimes(1 + MAX_POLL_ATTEMPTS);
    expect(vi.getTimerCount()).toBe(0);
    expect(wrapper.text()).not.toContain("Transaction not found yet");
    // Terminal outcome is announced: EmptyState renders inside role=status.
    expect(wrapper.find('[role="status"] empty-state-stub').exists()).toBe(true);
    expect(wrapper.find("button.btn-outline").exists()).toBe(true);
    wrapper.unmount();
  });

  it("skips polling entirely for malformed hashes", async () => {
    route.params.txhash = "0xnot-a-real-hash";
    const wrapper = mountView();
    await flushPromises();

    expect(getByHash).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(wrapper.find("empty-state-stub").exists()).toBe(true);
    wrapper.unmount();
  });

  it("stops the poll chain on unmount even when a fetch is mid-flight", async () => {
    let resolveInFlight;
    getByHash
      .mockResolvedValueOnce(null) // initial load
      .mockImplementationOnce(() => new Promise((resolve) => (resolveInFlight = resolve)));

    const wrapper = mountView();
    await flushPromises();

    // First poll tick starts, nulls its own timer handle, and suspends on the
    // in-flight fetch — the exact window where stopPolling alone is a no-op.
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(getByHash).toHaveBeenCalledTimes(2);

    wrapper.unmount();
    resolveInFlight(null);
    await flushPromises();

    // The resolved fetch must not re-arm setTimeout on the dead component.
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * MAX_POLL_ATTEMPTS);
    expect(getByHash).toHaveBeenCalledTimes(2);
  });

  it("renders the transaction as soon as a poll attempt finds it", async () => {
    getByHash.mockResolvedValueOnce(null).mockResolvedValueOnce({
      hash: WELL_FORMED_HASH,
      blockIndex: 42,
      status: "ok",
      confirmations: 1,
      timestampMs: Date.now(),
      sender: "0x1111111111111111111111111111111111111111",
      to: "0x2222222222222222222222222222222222222222",
      value: "0",
      fee: "0",
      gasUsed: "21000",
      gasLimit: "21000",
      tokenTransfers: [],
      transactionTypes: [],
    });

    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("Transaction not found yet");

    await advanceOnePoll();
    expect(wrapper.text()).not.toContain("Transaction not found yet");
    expect(wrapper.find("h1.page-title").exists()).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    wrapper.unmount();
  });
});
