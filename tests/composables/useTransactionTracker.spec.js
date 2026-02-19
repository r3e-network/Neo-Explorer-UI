import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { useTransactionTracker } from "../../src/composables/useTransactionTracker";
import { rpc } from "../../src/services/api";

vi.mock("../../src/services/api", () => ({
  rpc: vi.fn(),
}));

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const waitForStatus = async (txStatuses, txid, expectedStatus) => {
  for (let i = 0; i < 6; i += 1) {
    await flushPromises();
    if (txStatuses.value[txid] === expectedStatus) return;
    await vi.advanceTimersByTimeAsync(0);
  }
  expect(txStatuses.value[txid]).toBe(expectedStatus);
};

function mountTrackerComposable() {
  let composable;
  const TestComponent = defineComponent({
    setup() {
      composable = useTransactionTracker();
      return {};
    },
    template: "<div />",
  });

  const wrapper = mount(TestComponent);
  return { ...composable, unmount: () => wrapper.unmount() };
}

describe("useTransactionTracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("uses indexed neo3fura method when available", async () => {
    rpc.mockResolvedValueOnce({ executions: [{ vmstate: "HALT" }] });
    const { track, txStatuses, unmount } = mountTrackerComposable();

    track("0xtx-indexed");
    await waitForStatus(txStatuses, "0xtx-indexed", "confirmed");

    expect(rpc).toHaveBeenCalledWith("GetApplicationLogByTransactionHash", { TransactionHash: "0xtx-indexed" });
    expect(txStatuses.value["0xtx-indexed"]).toBe("confirmed");

    unmount();
  });

  it("falls back to legacy native RPC when indexed method is unavailable", async () => {
    rpc.mockRejectedValueOnce(new Error("RPC Error -32601: JSON RPC method not found"));
    rpc.mockResolvedValueOnce({ executions: [{ vmstate: "FAULT" }] });
    const { track, txStatuses, unmount } = mountTrackerComposable();

    track("0xtx-legacy");
    await waitForStatus(txStatuses, "0xtx-legacy", "failed");

    expect(rpc).toHaveBeenNthCalledWith(1, "GetApplicationLogByTransactionHash", { TransactionHash: "0xtx-legacy" });
    expect(rpc).toHaveBeenNthCalledWith(2, "getapplicationlog", ["0xtx-legacy"]);
    expect(txStatuses.value["0xtx-legacy"]).toBe("failed");

    unmount();
  });

  it("marks transaction as unknown after max polling attempts", async () => {
    rpc.mockResolvedValue({});
    const { track, txStatuses, unmount } = mountTrackerComposable();

    track("0xtx-unknown");
    await flushPromises();

    for (let i = 0; i < 7; i += 1) {
      await vi.advanceTimersByTimeAsync(15000);
      await flushPromises();
    }

    expect(rpc).toHaveBeenCalledTimes(8);
    expect(txStatuses.value["0xtx-unknown"]).toBe("unknown");

    unmount();
  });
});
