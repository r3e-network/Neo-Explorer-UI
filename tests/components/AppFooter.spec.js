// Chain-aware footer: every branded surface (logo, label, description, link
// columns, data-backend credit) must follow the active chain, keyed off the
// /x route prefix.
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import AppFooter from "@/components/layout/AppFooter.vue";

let mockPath = "/homepage";

vi.mock("vue-router", () => ({
  useRoute: () => ({ path: mockPath }),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

function mountFooter(path) {
  mockPath = path;
  return mount(AppFooter, {
    global: {
      mocks: { $t: (key) => key },
      stubs: {
        RouterLink: { props: ["to"], template: "<a :href=\"to\"><slot /></a>" },
      },
    },
  });
}

const linkHrefs = (wrapper) => wrapper.findAll("a[href]").map((a) => a.attributes("href"));

describe("AppFooter chain awareness", () => {
  it("brands for Neo N3 and credits neo3fura on N3 routes", () => {
    const wrapper = mountFooter("/homepage");

    expect(wrapper.text()).toContain("Neo Explorer");
    expect(wrapper.text()).not.toContain("Neo X Explorer");
    expect(wrapper.text()).toContain("Neo N3");
    expect(wrapper.text()).toContain("neo3fura");
    expect(wrapper.text()).not.toContain("Blockscout");
    expect(wrapper.find("img").attributes("src")).toBe("/img/brand/neo.png");

    const hrefs = linkHrefs(wrapper);
    expect(hrefs).toContain("/blocks/1");
    expect(hrefs).toContain("/verify-contract/");
    expect(hrefs.some((href) => href.startsWith("/x/"))).toBe(false);
    wrapper.unmount();
  });

  it("brands for Neo X and credits Blockscout on /x routes", () => {
    const wrapper = mountFooter("/x/blocks");

    expect(wrapper.text()).toContain("Neo X Explorer");
    expect(wrapper.text()).toContain("Blockscout");
    expect(wrapper.text()).not.toContain("neo3fura");
    expect(wrapper.find("img").attributes("src")).toBe("/img/brand/neox-mark.svg");

    const hrefs = linkHrefs(wrapper);
    expect(hrefs).toContain("/x/blocks");
    expect(hrefs).toContain("/x/anti-mev");
    // Verify Contract is an N3-only flow — it must disappear on Neo X.
    expect(hrefs).not.toContain("/verify-contract/");
    wrapper.unmount();
  });
});
