import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const envState = { value: "MainNet" };

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    saveNetworkAlert: vi.fn(),
  },
}));

vi.mock("@/utils/env", () => ({
  getCurrentEnv: () => envState.value,
  NETWORK_CHANGE_EVENT: "neo-explorer-network-change",
}));

describe("NetworkAlertsTool network changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envState.value = "MainNet";
  });

  it("updates the default network selector when the explorer network changes", async () => {
    const NetworkAlertsTool = (await import("@/views/Tools/NetworkAlertsTool.vue")).default;
    const wrapper = mount(NetworkAlertsTool, {
      global: {
        stubs: {
          Breadcrumb: true,
        },
      },
    });

    const select = wrapper.find('select');
    expect(select.element.value).toBe('mainnet');

    envState.value = "TestT5";
    window.dispatchEvent(new CustomEvent("neo-explorer-network-change", { detail: { env: "TestT5" } }));
    await flushPromises();

    expect(select.element.value).toBe('testnet');
    wrapper.unmount();
  });
});
