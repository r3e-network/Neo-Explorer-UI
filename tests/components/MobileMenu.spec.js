import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import MobileMenu from "@/components/layout/MobileMenu.vue";

describe("MobileMenu", () => {
  it("uses theme-aware visible colors and exposes expanded state", async () => {
    const wrapper = mount(MobileMenu, {
      props: { open: false },
      global: { mocks: { $t: (key) => key } },
    });

    const button = wrapper.get("button");
    expect(button.attributes("aria-label")).toBe("aria.toggleMenu");
    expect(button.attributes("aria-expanded")).toBe("false");
    expect(button.classes()).toContain("text-mid");
    expect(button.classes()).toContain("dark:text-white/70");

    await wrapper.setProps({ open: true });
    expect(button.attributes("aria-expanded")).toBe("true");
  });
});
