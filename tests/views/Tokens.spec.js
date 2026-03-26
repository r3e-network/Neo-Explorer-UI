import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getNep17ListMock = vi.fn();
const getNep11ListMock = vi.fn();
const getTokenListWithFallbackMock = vi.fn();
const routeParams = { tab: "nep11", page: "1" };

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key) =>
      ({
        "errors.loadTokens": "Failed to load tokens. Please try again.",
        "errors.loadTokensUnavailable": "Token listing is currently unavailable from the backend API.",
        "nav.tokens": "Tokens",
      })[key] || key,
  }),
}));

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: routeParams }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/services", () => ({
  tokenService: {
    getNep17List: getNep17ListMock,
    getNep11List: getNep11ListMock,
    getTokenListWithFallback: getTokenListWithFallbackMock,
    searchNep17ByName: vi.fn(),
    searchNep11ByName: vi.fn(),
  },
}));

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getContractMetadataBatch: vi.fn(async () => ({})),
  },
}));

vi.mock("@/utils/getTokenIcon", () => ({
  getTokenIcon: vi.fn(() => "https://example.com/token.png"),
  hasTokenIcon: vi.fn(() => false),
}));

describe("Tokens view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeParams.tab = "nep11";
    routeParams.page = "1";
    getTokenListWithFallbackMock.mockResolvedValue({ result: [], totalCount: 0 });
  });

  it("initializes the active tab from the route and shows a backend-unavailable message for NEP-11 token lists", async () => {
    getTokenListWithFallbackMock.mockRejectedValueOnce(new Error("RPC Error: not found"));

    const Tokens = (await import("@/views/Token/Tokens.vue")).default;
    const wrapper = mount(Tokens, {
      global: {
        mocks: {
          $t: (key) =>
            ({
              "nav.tokens": "Tokens",
            })[key] || key,
        },
        stubs: {
          Breadcrumb: true,
          EmptyState: true,
          ErrorState: {
            props: ["title", "message"],
            template: "<div>{{ title }} {{ message }}</div>",
          },
          Skeleton: true,
          EtherscanPagination: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    expect(getTokenListWithFallbackMock).toHaveBeenCalled();
    expect(wrapper.text()).toContain("NEP-11 NFT Collection List");
    expect(wrapper.text()).toContain("Unable to load tokens");
    expect(wrapper.text()).toContain("Token listing is currently unavailable from the backend API.");
  });

  it("renders NEP-17 token rows returned by the fallback listing service", async () => {
    routeParams.tab = "nep17";
    getTokenListWithFallbackMock.mockResolvedValueOnce({
      result: [
        {
          hash: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
          tokenname: "NeoToken",
          symbol: "NEO",
          holders: 123,
          totalsupply: "100000000",
          decimals: 0,
        },
      ],
      totalCount: 1,
    });

    const Tokens = (await import("@/views/Token/Tokens.vue")).default;
    const wrapper = mount(Tokens, {
      global: {
        mocks: {
          $t: (key) =>
            ({
              "nav.tokens": "Tokens",
            })[key] || key,
        },
        stubs: {
          Breadcrumb: true,
          EmptyState: true,
          ErrorState: true,
          Skeleton: true,
          EtherscanPagination: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    expect(getTokenListWithFallbackMock).toHaveBeenCalledWith("NEP17", expect.any(Number), 0, { search: "" });
    expect(wrapper.text()).toContain("NeoToken");
    expect(wrapper.text()).toContain("NEO");
    expect(wrapper.text()).toContain("123");
  });
});
