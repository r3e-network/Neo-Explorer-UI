import { mount } from "@vue/test-utils";
import { describe, it, expect, vi } from "vitest";
import BlockListItem from "@/components/common/BlockListItem.vue";
import { scriptHashToAddress } from "@/utils/neoHelpers";

vi.mock("@vueuse/core", () => ({
  useNow: () => ({ value: new Date() }),
}));

vi.mock("@/utils/explorerFormat", () => ({
  formatAge: () => "just now",
  formatNumber: (n) => n,
  formatGas: (n) => n,
}));

vi.mock("@/composables/useCommittee", () => ({
  useCommittee: () => ({
    getPrimaryNodeName: vi.fn((idx) => `Unknown Validator`),
    getPrimaryNodeAddress: vi.fn(() => "0x123")
  })
}));

describe("BlockListItem", () => {
  it("renders validator from speaker fallback when nextconsensus is absent", () => {
    const wrapper = mount(BlockListItem, {
      props: {
        block: {
          index: 100,
          timestamp: Date.now(),
          transactioncount: 5,
          systemFee: 1,
          networkFee: 1,
          size: 1000,
          primary: 0,
          speaker: "0x123",
        },
      },
      global: {
        stubs: ["router-link", "HashLink"],
      },
    });
    expect(wrapper.text()).toContain("Unknown Validator");
  });
});
