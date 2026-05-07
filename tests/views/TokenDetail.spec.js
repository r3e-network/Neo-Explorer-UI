import { mount } from "@vue/test-utils";
import { computed, ref } from "vue";
import { describe, expect, it, vi } from "vitest";

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key) => key;
  },
};

vi.mock("vue-i18n", async () => {
  const actual = await vi.importActual("vue-i18n");
  return {
    ...actual,
    useI18n: () => ({ t: (k) => k, locale: { value: "en" } }),
  };
});

vi.mock("@/composables/useTokenDetail", () => ({
  useTokenDetail: () => ({
    isLoading: computed(() => false),
    error: computed(() => null),
    tokenInfo: ref(null),
    activeName: ref("transfers"),
    tabs: [
      { key: "transfers", label: "Transfers" },
      { key: "holders", label: "Top Holders" },
    ],
    reloadToken: vi.fn(),
    tokenMetadata: ref({
      name: "NeoToken",
      symbol: "NEO",
    }),
  }),
}));

describe("TokenDetail view", () => {
  it("renders token metadata without crashing when token data has not loaded yet", async () => {
    const TokenDetail = (await import("@/views/Token/TokenDetail.vue")).default;
    const wrapper = mount(TokenDetail, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          Breadcrumb: true,
          InfoRow: true,
          Skeleton: true,
          TabsNav: true,
          TransferTable: true,
          TokenHolder: true,
          ErrorState: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    expect(wrapper.text()).toContain("NeoToken");
  });
});
