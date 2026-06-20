import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/common/BlockListItem.vue", () => ({
  default: defineComponent({
    name: "BlockListItem",
    props: {
      block: { type: Object, default: () => ({}) },
      stateRootValidated: { type: Boolean, default: false },
      stateRootValidatedHeight: { type: [Number, String], default: null },
    },
    template:
      '<div data-testid="block-row" :data-index="String(block.index)" :data-validated="String(stateRootValidated)" :data-validated-height="String(stateRootValidatedHeight ?? \'\')"></div>',
  }),
}));

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key) => key;
  },
};

describe("LatestBlocks validated state root markers", () => {
  it("marks only blocks covered by the validated state root height", async () => {
    const LatestBlocks = (await import("@/views/Home/components/LatestBlocks.vue")).default;
    const wrapper = mount(LatestBlocks, {
      props: {
        blocks: [
          { hash: "0x13", index: 13 },
          { hash: "0x12", index: 12 },
          { hash: "0x11", index: 11 },
        ],
        validatedStateRoot: {
          validated: true,
          validatedrootindex: 12,
        },
      },
      global: {
        plugins: [i18nPlugin],
        stubs: {
          "router-link": { template: "<a><slot /></a>" },
          Skeleton: true,
          EmptyState: true,
          ErrorState: true,
        },
      },
    });

    const rows = wrapper.findAll('[data-testid="block-row"]');
    expect(rows.map((row) => row.attributes("data-validated"))).toEqual(["false", "true", "true"]);
    expect(rows.map((row) => row.attributes("data-validated-height"))).toEqual(["12", "12", "12"]);
  });

  it("does not mark blocks when the state root is not validated", async () => {
    const LatestBlocks = (await import("@/views/Home/components/LatestBlocks.vue")).default;
    const wrapper = mount(LatestBlocks, {
      props: {
        blocks: [{ hash: "0x12", index: 12 }],
        validatedStateRoot: {
          validated: false,
          validatedrootindex: 12,
        },
      },
      global: {
        plugins: [i18nPlugin],
        stubs: {
          "router-link": { template: "<a><slot /></a>" },
          Skeleton: true,
          EmptyState: true,
          ErrorState: true,
        },
      },
    });

    expect(wrapper.get('[data-testid="block-row"]').attributes("data-validated")).toBe("false");
  });
});
