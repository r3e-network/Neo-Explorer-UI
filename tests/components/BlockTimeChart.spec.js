import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import BlockTimeChart from "@/components/common/BlockTimeChart.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key) => key,
  }),
}));

vi.mock("@/composables/useCommittee", () => ({
  useCommittee: () => ({
    getPrimaryNodeName: vi.fn((index) => (index === 1 ? "NF1" : `Validator ${index}`)),
  }),
}));

describe("BlockTimeChart", () => {
  it("shows the consensus node name for the inspected slow block", async () => {
    const wrapper = mount(BlockTimeChart, {
      props: {
        blocks: [
          { height: 108, interval: 3, tx: 1, primaryNode: 0 },
          { height: 107, interval: 8.4, tx: 0, primaryNode: 1 },
          { height: 106, interval: 3.1, tx: 2, primaryNode: 2 },
        ],
      },
      global: {
        stubs: {
          Skeleton: true,
          EmptyState: true,
        },
      },
    });

    expect(wrapper.text()).toContain("NF1");

    const slowBlock = wrapper.get('button[aria-label*="#107"]');
    await slowBlock.trigger("mouseenter");

    expect(wrapper.text()).toContain("#107");
    expect(wrapper.text()).toContain("8.40s");
    expect(wrapper.text()).toContain("NF1");
  });

  it("does not render missing or non-positive intervals as zero-second bars", () => {
    const wrapper = mount(BlockTimeChart, {
      props: {
        blocks: [
          { height: 110, interval: 0, tx: 0, primaryNode: 1 },
          { height: 109, tx: 0, primaryNode: 1 },
          { height: 108, interval: 3, tx: 1, primaryNode: 0 },
        ],
      },
      global: {
        stubs: {
          Skeleton: true,
          EmptyState: true,
        },
      },
    });

    expect(wrapper.findAll("button")).toHaveLength(1);
    expect(wrapper.text()).not.toContain("#110");
    expect(wrapper.text()).not.toContain("0s");
  });
});
