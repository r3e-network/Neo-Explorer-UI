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

    expect(rpc).toHaveBeenCalledWith("getapplicationlog", ["0xtx-indexed"], { network: "mainnet" });
    expect(txStatuses.value["0xtx-indexed"]).toBe("confirmed");

    unmount();
  });

  it("supports flattened indexed application log shape", async () => {
    rpc.mockResolvedValueOnce({ vmstate: "FAULT" });
    const { track, txStatuses, unmount } = mountTrackerComposable();

    track("0xtx-flat");
    await waitForStatus(txStatuses, "0xtx-flat", "failed");

    expect(rpc).toHaveBeenCalledWith("getapplicationlog", ["0xtx-flat"], { network: "mainnet" });
    expect(txStatuses.value["0xtx-flat"]).toBe("failed");

    unmount();
  });

  it("keeps polling without calling legacy PascalCase RPC when standard getapplicationlog is unavailable", async () => {
    rpc.mockRejectedValueOnce(new Error("RPC Error -32601: JSON RPC method not found"));
    const { track, txStatuses, unmount } = mountTrackerComposable();

    track("0xtx-legacy");
    await flushPromises();

    expect(rpc).toHaveBeenCalledWith("getapplicationlog", ["0xtx-legacy"], { network: "mainnet" });
    expect(rpc).not.toHaveBeenCalledWith("GetApplicationLogByTransactionHash", expect.anything());
    expect(txStatuses.value["0xtx-legacy"]).toBe("pending");

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
