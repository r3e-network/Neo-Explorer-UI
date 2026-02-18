import { mount } from "@vue/test-utils";
import { describe, it, expect, vi } from "vitest";

import TabsNav from "@/components/common/TabsNav.vue";

const tabs = [
  { key: "txns", label: "Transactions", count: 42 },
  { key: "internal", label: "Internal" },
  { key: "tokens", label: "Tokens", count: 5 },
];

const factory = (props = {}) => mount(TabsNav, { props: { tabs, modelValue: "txns", ...props } });

describe("TabsNav", () => {
  it("renders all tab labels", () => {
    const wrapper = factory();
    expect(wrapper.text()).toContain("Transactions");
    expect(wrapper.text()).toContain("Internal");
    expect(wrapper.text()).toContain("Tokens");
  });

  it("marks active tab with aria-selected='true'", () => {
    const wrapper = factory({ modelValue: "internal" });
    const active = wrapper.findAll("[role='tab']").find((b) => b.text().includes("Internal"));
    expect(active.attributes("aria-selected")).toBe("true");
  });

  it("inactive tabs have tabindex='-1'", () => {
    const wrapper = factory({ modelValue: "txns" });
    const inactive = wrapper.findAll("[role='tab']").filter((b) => !b.text().includes("Transactions"));
    inactive.forEach((b) => expect(b.attributes("tabindex")).toBe("-1"));
  });

  it("emits update:modelValue on click", async () => {
    const wrapper = factory();
    const tokensTab = wrapper.findAll("[role='tab']").find((b) => b.text().includes("Tokens"));
    await tokensTab.trigger("click");
    expect(wrapper.emitted("update:modelValue")[0]).toEqual(["tokens"]);
  });

  it("arrow keys cycle through tabs", async () => {
    const wrapper = factory({ modelValue: "txns" });
    const first = wrapper.findAll("[role='tab']")[0];
    await first.trigger("keydown.left");
    expect(wrapper.emitted("update:modelValue")[0]).toEqual(["tokens"]);
  });
});
