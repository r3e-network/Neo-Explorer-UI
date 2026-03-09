import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const NETWORK_CHANGE_EVENT = "neo-explorer-network-change";

vi.mock("@/utils/env", () => ({
  NETWORK_CHANGE_EVENT,
}));

describe("useNetworkChange", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers and cleans up a network-change listener in component scope", async () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const callback = vi.fn();

    const { useNetworkChange } = await import("../../src/composables/useNetworkChange.js");
    const Harness = defineComponent({
      template: "<div />",
      setup() {
        useNetworkChange(callback);
        return {};
      },
    });

    const wrapper = mount(Harness);
    expect(addSpy).toHaveBeenCalledWith(NETWORK_CHANGE_EVENT, expect.any(Function));

    const handler = addSpy.mock.calls.find((call) => call[0] === NETWORK_CHANGE_EVENT)?.[1];
    window.dispatchEvent(new CustomEvent(NETWORK_CHANGE_EVENT, { detail: { env: "TestT5" } }));
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ detail: { env: "TestT5" } }));

    wrapper.unmount();
    expect(removeSpy).toHaveBeenCalledWith(NETWORK_CHANGE_EVENT, handler);
  });
});
