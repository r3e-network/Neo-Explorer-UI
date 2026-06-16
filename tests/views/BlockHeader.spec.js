import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import BlockHeader from "@/views/Block/components/BlockHeader.vue";

const t = (key, params = {}) => {
  if (key === "blockDetail.breadcrumbBlock") return "Block";
  if (key === "blockDetail.breadcrumbBlockN") return `Block #${params.n}`;
  if (key === "blockDetail.navAria") return "Block navigation";
  if (key === "blockDetail.navPrev") return "Previous block";
  if (key === "blockDetail.navNext") return "Next block";
  if (key === "blockDetail.navPrevShort") return "Prev";
  if (key === "blockDetail.navNextShort") return "Next";
  return key;
};

describe("BlockHeader", () => {
  it("does not render a fake block zero while detail data is loading", () => {
    const wrapper = mount(BlockHeader, {
      props: {
        block: {},
        loading: true,
      },
      global: {
        mocks: { $t: t },
      },
    });

    expect(wrapper.text()).toContain("Block");
    expect(wrapper.text()).not.toContain("Block #0");
  });

  it("renders the actual block index when available", () => {
    const wrapper = mount(BlockHeader, {
      props: {
        block: { index: 123456 },
      },
      global: {
        mocks: { $t: t },
      },
    });

    expect(wrapper.text()).toContain("Block #123,456");
  });
});
