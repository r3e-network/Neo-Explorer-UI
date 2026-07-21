// Desktop nav dropdown focus-out: the DOM lookup is keyed off data-dropdown,
// never translated aria-label text, so keyboard focus-out closes dropdowns in
// every locale (the old aria-label selector only matched English).
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DesktopNav from "@/components/layout/DesktopNav.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

// Simulate a non-English locale: $t returns localized text that shares no
// substring with the English "<Name> menu" pattern.
const localized = (key) => `FR::${key}`;

function mountNav(activeDropdown = null) {
  return mount(DesktopNav, {
    attachTo: document.body,
    props: { activeDropdown },
    global: {
      mocks: { $t: localized },
      stubs: { RouterLink: { template: "<a><slot /></a>" } },
    },
  });
}

describe("DesktopNav", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("emits close-dropdown on focus-out even when aria-labels are localized", async () => {
    const wrapper = mountNav("blockchain");

    // Focus lands outside the dropdown (body) — the deferred check must find
    // the dropdown via data-dropdown and emit close.
    await wrapper.find('[data-dropdown="blockchain"]').trigger("focusout");
    vi.runAllTimers();

    expect(wrapper.emitted("close-dropdown")).toEqual([["blockchain"]]);
    wrapper.unmount();
  });

  it("keeps the dropdown open while focus stays inside it", async () => {
    const wrapper = mountNav("neox");
    const li = wrapper.find('[data-dropdown="neox"]');

    li.find("button").element.focus();
    await li.trigger("focusout");
    vi.runAllTimers();

    expect(wrapper.emitted("close-dropdown")).toBeUndefined();
    wrapper.unmount();
  });

  it("gives every dropdown a locale-independent data-dropdown key", () => {
    const wrapper = mountNav();
    const keys = wrapper.findAll("[data-dropdown]").map((el) => el.attributes("data-dropdown"));
    expect(keys).toEqual(["blockchain", "tokens", "neox", "resources", "developers"]);
    wrapper.unmount();
  });

  it("localizes the Neo X menu aria-label through tf with an English fallback", () => {
    const wrapper = mountNav();
    const button = wrapper.find('[data-dropdown="neox"] button');
    // Key is missing from the catalog, so tf falls back to English — but the
    // binding goes through i18n so locales can override it.
    expect(button.attributes("aria-label")).toBe("Neo X menu");
    wrapper.unmount();
  });
});
