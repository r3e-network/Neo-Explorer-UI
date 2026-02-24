import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import BlockListItem from "@/components/common/BlockListItem.vue";

describe("BlockListItem", () => {
  it("renders validator from speaker fallback when nextconsensus is absent", () => {
    const validatorAddress = "Ndrh6jo4f4N9Qf4iR6Qv6sQ7mW9A6JtY4M";

    const wrapper = mount(BlockListItem, {
      props: {
        block: {
          hash: "0x9f8b20c31bb9e45003f2d9f316d2caf1dcd1bf20",
          index: 123,
          timestamp: Date.now(),
          transactioncount: 1,
          speaker: validatorAddress,
        },
      },
      global: {
        stubs: {
          RouterLink: {
            name: "RouterLink",
            props: ["to"],
            template: "<a><slot /></a>",
          },
        },
      },
    });

    expect(wrapper.text()).toContain("Ndrh6jo4...6JtY4M");
    expect(wrapper.text()).not.toContain("--");
  });
});
