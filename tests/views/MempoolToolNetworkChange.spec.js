import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const envState = { value: "MainNet" };
const getMempoolTransactions = vi.fn();

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getMempoolTransactions,
  },
}));

vi.mock("@/utils/env", () => ({
  getCurrentEnv: () => envState.value,
  getNetworkRefreshIntervalMs: vi.fn(() => 15000),
  NETWORK_CHANGE_EVENT: "neo-explorer-network-change",
}));

vi.mock("@vueuse/core", () => ({
  useNow: () => ({ value: new Date(0) }),
}));

vi.mock("@/utils/explorerFormat", () => ({
  formatAge: () => "just now",
  formatGas: () => "0 GAS",
}));

describe("MempoolTool network changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envState.value = "MainNet";
    getMempoolTransactions.mockResolvedValue([]);
  });

  it("refetches mempool data immediately when the explorer network changes", async () => {
    const MempoolTool = (await import("@/views/Tools/MempoolTool.vue")).default;
    const wrapper = mount(MempoolTool, {
      global: {
        stubs: {
          Breadcrumb: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();
    expect(getMempoolTransactions).toHaveBeenCalledTimes(1);
    expect(getMempoolTransactions).toHaveBeenNthCalledWith(1, 'mainnet', 1000);

    envState.value = "TestT5";
    window.dispatchEvent(new CustomEvent("neo-explorer-network-change", { detail: { env: "TestT5" } }));
    await flushPromises();

    expect(getMempoolTransactions).toHaveBeenCalledTimes(2);
    expect(getMempoolTransactions).toHaveBeenNthCalledWith(2, 'testnet', 1000);
    wrapper.unmount();
  });
});
