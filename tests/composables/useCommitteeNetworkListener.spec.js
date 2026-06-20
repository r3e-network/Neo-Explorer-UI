import { defineComponent } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.hoisted(() => vi.fn());
const cachedRequestMock = vi.hoisted(() => vi.fn());
const getCurrentEnvMock = vi.hoisted(() => vi.fn());
const getValidatorMetadataMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/api", () => ({ rpc: rpcMock }));
vi.mock("@/services/cache", () => ({ cachedRequest: cachedRequestMock }));
vi.mock("@/utils/env", () => ({
  getCurrentEnv: getCurrentEnvMock,
  resolveNetworkName: vi.fn((env) => {
    const value = String(env || getCurrentEnvMock() || "mainnet").toLowerCase();
    return value.includes("test") ? "testnet" : "mainnet";
  }),
  NET_ENV: { TestT5: "TestT5" },
  NETWORK_CHANGE_EVENT: "neo-explorer-network-change",
}));
vi.mock("@/services/supabaseService", () => ({
  supabaseService: { getValidatorMetadata: getValidatorMetadataMock },
}));

describe("useCommittee network listener cleanup", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getCurrentEnvMock.mockReturnValue("MainNet");
    getValidatorMetadataMock.mockResolvedValue([]);
    cachedRequestMock.mockResolvedValue([]);
    rpcMock.mockResolvedValue([]);
  });

  afterEach(() => {
    // Restore window.addEventListener / removeEventListener spies. Without
    // this, the next test in the worker that calls window.addEventListener
    // hits a stale spy whose mock state can interfere with assertions.
    vi.restoreAllMocks();
  });

  it("removes its network-change listener on unmount", async () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { useCommittee } = await import("@/composables/useCommittee");
    const Harness = defineComponent({
      template: "<div />",
      setup() {
        useCommittee();
        return {};
      },
    });

    const wrapper = mount(Harness);
    await flushPromises();

    const handler = addSpy.mock.calls.find((call) => call[0] === "neo-explorer-network-change")?.[1];
    expect(handler).toEqual(expect.any(Function));

    wrapper.unmount();

    expect(removeSpy).toHaveBeenCalledWith("neo-explorer-network-change", handler);
  });
});
