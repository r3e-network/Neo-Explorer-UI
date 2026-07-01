import { mount } from "@vue/test-utils";
import { computed, ref } from "vue";
import { readFileSync } from "node:fs";
import path from "node:path";
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

  it("bounds token-detail child tables so slow indexer requests cannot leave visible skeletons", () => {
    const transferTable = readFileSync(
      path.resolve(process.cwd(), "src/components/common/TransferTable.vue"),
      "utf8",
    );
    const tokenHolder = readFileSync(
      path.resolve(process.cwd(), "src/views/Token/TokenHolder.vue"),
      "utf8",
    );
    const nftTokens = readFileSync(
      path.resolve(process.cwd(), "src/views/Token/NftTokens.vue"),
      "utf8",
    );
    const useTokenDetail = readFileSync(
      path.resolve(process.cwd(), "src/composables/useTokenDetail.js"),
      "utf8",
    );

    expect(useTokenDetail).toContain("TOKEN_DETAIL_LOAD_TIMEOUT_MS");
    expect(useTokenDetail).toContain("createMinimalTokenInfo");
    expect(transferTable).toContain("TOKEN_DETAIL_TABLE_TIMEOUT_MS");
    expect(tokenHolder).toContain("TOKEN_HOLDERS_TABLE_TIMEOUT_MS");
    expect(tokenHolder).toContain("formatHolderAddress");
    expect(tokenHolder).toMatch(/\^0x\[0-9a-f\]\{40\}/);
    expect(nftTokens).toContain("NFT_ITEMS_LOAD_TIMEOUT_MS");
    expect(nftTokens).toContain("loading.value = false;");
  });
});
