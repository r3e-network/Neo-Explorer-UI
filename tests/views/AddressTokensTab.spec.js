import { mount, config } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

config.global.mocks = { ...(config.global.mocks || {}), $t: (k) => k };

vi.mock("vue-i18n", async () => {
  const actual = await vi.importActual("vue-i18n");
  return {
    ...actual,
    useI18n: () => ({ t: (k) => k, locale: { value: "en" } }),
  };
});

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getContractMetadataBatch: vi.fn().mockResolvedValue({}),
  },
}));

import AddressTokensTab from "@/views/Account/components/AddressTokensTab.vue";

function factory(assets) {
  return mount(AddressTokensTab, {
    props: {
      assets,
      loading: false,
      error: "",
    },
    global: {
      stubs: {
        "router-link": {
          template: "<a><slot /></a>",
        },
      },
    },
  });
}

describe("AddressTokensTab balance formatting", () => {
  it("formats GAS fixed8 balances using native decimals", () => {
    const wrapper = factory([
      {
        tokenname: "GasToken",
        standard: "NEP17",
        asset: "0xd2a4cff31913016155e38e474a2c06d08be276cf",
        balance: "68463187427",
      },
    ]);

    expect(wrapper.text()).toContain("684.63187427");
  });

  it("formats balances using explicit token decimals when provided", () => {
    const wrapper = factory([
      {
        tokenname: "MockToken",
        standard: "NEP17",
        asset: "0x1234567890abcdef1234567890abcdef12345678",
        balance: "12345",
        decimals: 2,
      },
    ]);

    expect(wrapper.text()).toContain("123.45");
  });

  it("does not re-divide balances already returned as decimal strings", () => {
    const wrapper = factory([
      {
        tokenname: "GasToken",
        standard: "NEP17",
        asset: "0xd2a4cff31913016155e38e474a2c06d08be276cf",
        balance: "12.34",
      },
    ]);

    expect(wrapper.text()).toContain("12.34");
  });
});
