import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key) => key;
  },
};

const route = { params: { contractHash: "0xcontract", address: "Naddr", tokenId: "token-1" } };
const getNep11Properties = vi.fn();

vi.mock("vue-router", () => ({
  useRoute: () => route,
}));

vi.mock("@/utils/healthCheck", () => ({
  checkAndSetEndpoints: vi.fn(() => Promise.resolve()),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key) => key,
  }),
}));

vi.mock("@/services/tokenService", () => ({
  tokenService: {
    getNep11Properties,
  },
}));

describe("NFTInfo network changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.params.contractHash = "0xcontract";
    route.params.address = "Naddr";
    route.params.tokenId = "token-1";
    getNep11Properties.mockResolvedValue({
      result: [{ name: "NFT One", image: "https://example.com/nft.png", description: "desc" }],
    });
  });

  it("reloads NFT properties when the explorer network changes", async () => {
    const NFTInfo = (await import("@/views/Token/NFTInfo.vue")).default;
    const wrapper = mount(NFTInfo, {
      global: {
        plugins: [i18nPlugin],
        directives: { lazyImage: {} },
        stubs: {
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
          Breadcrumb: true,
          Skeleton: true,
          ErrorState: true,
          InfoRow: true,
          HashLink: true,
        },
      },
    });

    await flushPromises();
    expect(getNep11Properties).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new CustomEvent("neo-explorer-network-change", { detail: { env: "TestT5" } }));
    await flushPromises();

    expect(getNep11Properties).toHaveBeenCalledTimes(2);
    expect(getNep11Properties).toHaveBeenNthCalledWith(2, "0xcontract", ["token-1"]);
    wrapper.unmount();
  });
});
