import { defineComponent } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  route,
  push,
  getTokenByHashWithFallback,
  getContractByHash,
  getContractByHashWithFallback,
  getContractMetadata,
} = vi.hoisted(() => ({
  route: { params: { hash: "0xtoken" } },
  push: vi.fn(),
  getTokenByHashWithFallback: vi.fn(),
  getContractByHash: vi.fn(),
  getContractByHashWithFallback: vi.fn(),
  getContractMetadata: vi.fn(),
}));

vi.mock("vue-router", () => ({
  useRoute: () => route,
  useRouter: () => ({ push }),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key) => key,
  }),
}));

vi.mock("@/services/tokenService", () => ({
  tokenService: {
    getByHashWithFallback: getTokenByHashWithFallback,
  },
}));

vi.mock("@/services/contractService", () => ({
  contractService: {
    getByHash: getContractByHash,
    getByHashWithFallback: getContractByHashWithFallback,
  },
}));

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getContractMetadata,
  },
}));

vi.mock("@/utils/contractInvocation", () => ({
  invokeContractFunction: vi.fn(),
}));

import { useTokenDetail } from "@/composables/useTokenDetail";

describe("useTokenDetail network changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.params.hash = "0xtoken";
    getTokenByHashWithFallback.mockResolvedValue({ hash: "0xtoken", tokenname: "Token", decimals: 8 });
    getContractByHash.mockResolvedValue({ hash: "0xtoken", manifest: "{}", updatecounter: 0 });
    getContractByHashWithFallback.mockResolvedValue({ hash: "0xtoken", manifest: "{}", updatecounter: 0 });
    getContractMetadata.mockResolvedValue(null);
    push.mockResolvedValue();
  });

  it("reloads token and contract data when the explorer network changes", async () => {
    const Harness = defineComponent({
      template: "<div />",
      setup() {
        useTokenDetail({ defaultTab: "transfers", tabs: [] });
        return {};
      },
    });

    const wrapper = mount(Harness);
    await flushPromises();

    expect(getTokenByHashWithFallback).toHaveBeenCalledTimes(1);
    expect(getContractByHashWithFallback).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new CustomEvent("neo-explorer-network-change", { detail: { env: "TestT5" } }));
    await flushPromises();

    expect(getTokenByHashWithFallback).toHaveBeenCalledTimes(2);
    expect(getContractByHashWithFallback).toHaveBeenCalledTimes(2);
    expect(getContractMetadata).toHaveBeenCalledTimes(2);

    wrapper.unmount();
  });

  it("preserves object manifests returned by native contract-state fallback", async () => {
    getContractByHashWithFallback.mockResolvedValueOnce({
      hash: "0xtoken",
      manifest: {
        abi: {
          methods: [{ name: "transfer" }],
          events: [{ name: "Transfer" }],
        },
      },
      updatecounter: 1,
    });

    let exposed;
    const Harness = defineComponent({
      template: "<div />",
      setup() {
        exposed = useTokenDetail({ defaultTab: "transfers", tabs: [] });
        return {};
      },
    });

    const wrapper = mount(Harness);
    await flushPromises();

    expect(exposed.manifest.value?.abi?.methods?.length).toBe(1);
    expect(exposed.updateCounter.value).toBe(1);

    wrapper.unmount();
  });
});
