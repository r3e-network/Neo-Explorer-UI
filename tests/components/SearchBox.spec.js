import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: {} }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/utils/explorerFormat", () => ({
  getTypeIcon: () => "Tx",
  getTypeIconClass: () => "bg-green-100",
  getTypeBadgeClass: () => "bg-green-100",
}));
vi.mock("@/constants", () => ({ SEARCH_DEBOUNCE_MS: 350 }));

import SearchBox from "@/components/common/SearchBox.vue";

const factory = (props = {}) =>
  mount(SearchBox, {
    props: { ...props },
    global: { stubs: { "router-link": { template: "<a><slot /></a>", props: ["to"] } } },
  });

describe("SearchBox", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders input with placeholder", () => {
    const wrapper = factory({ placeholder: "Search here" });
    expect(wrapper.find("input").attributes("placeholder")).toContain("Search here");
  });

  it("emits search on Enter with trimmed query", async () => {
    const wrapper = factory();
    const input = wrapper.find("input");
    await input.setValue("  0xabc  ");
    await input.trigger("keyup.enter");
    expect(wrapper.emitted("search")[0]).toEqual(["0xabc"]);
  });

  it("does not emit search when input is empty", async () => {
    const wrapper = factory();
    await wrapper.find("input").trigger("keyup.enter");
    expect(wrapper.emitted("search")).toBeUndefined();
  });

  it("disables search button when query is empty", () => {
    const wrapper = factory();
    const btn = wrapper.find("button[aria-label='Submit search']");
    expect(btn.attributes("disabled")).toBeDefined();
  });

  it("shows dropdown on focus", async () => {
    const wrapper = factory();
    await wrapper.find("input").trigger("focus");
    expect(wrapper.find("#search-dropdown").exists()).toBe(true);
  });
});
