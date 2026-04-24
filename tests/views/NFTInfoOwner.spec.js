import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key) => key;
  },
};
import { scriptHashToAddress } from "@/utils/neoHelpers";

const route = {
  params: {
    contractHash: "0xcontract",
    address: scriptHashToAddress("0x5a0a0f188f2582ad60c1970267df30ec5428100d"),
    tokenId: "token-1",
  },
};

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

vi.mock("@/services", () => ({
  tokenService: {
    getNep11Properties,
  },
  contractService: {
    getByHashWithFallback: vi.fn(async () => null),
  },
}));

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getAddressTag: vi.fn(async () => null),
    getValidatorMetadata: vi.fn(async () => []),
    getContractMetadata: vi.fn(async () => null),
  },
}));

vi.mock("@/services/nnsService", () => ({
  default: {
    resolveAddressToNNS: vi.fn(async () => null),
  },
}));

describe("NFTInfo owner identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.params.contractHash = "0xcontract";
    route.params.address = scriptHashToAddress("0x5a0a0f188f2582ad60c1970267df30ec5428100d");
    route.params.tokenId = "token-1";
    getNep11Properties.mockResolvedValue({
      result: [{ name: "NFT One", image: "https://example.com/nft.png", description: "desc" }],
    });
  });

  it("renders known contract branding when the owner address belongs to a known contract", async () => {
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
          InfoRow: {
            props: ["label", "value", "tooltip", "copyable", "copyValue"],
            template: '<div :data-label="label"><slot>{{ value }}</slot></div>',
          },
        },
      },
    });

    await flushPromises();

    expect(wrapper.find('[data-label="Owner"]').text()).toContain("OracleProxy");
    expect(wrapper.find('img[alt="OracleProxy"]').attributes("src")).toBe("https://x.neo.org/favicon.ico");
  });
});
