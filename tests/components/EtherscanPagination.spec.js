import { mount } from "@vue/test-utils";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/constants", () => ({ PAGE_SIZE_OPTIONS: [10, 25, 50, 100] }));

import EtherscanPagination from "@/components/common/EtherscanPagination.vue";

const factory = (props = {}) =>
  mount(EtherscanPagination, {
    props: { page: 1, totalPages: 5, total: 100, ...props },
  });

describe("EtherscanPagination", () => {
  it("renders showing record range", () => {
    const wrapper = factory({ page: 2, pageSize: 25, total: 100 });
    expect(wrapper.text()).toContain("Showing 26 to 50 of 100 records");
  });

  it("disables First/Prev buttons on page 1", () => {
    const wrapper = factory({ page: 1 });
    const buttons = wrapper.findAll("button");
    expect(buttons[0].attributes("disabled")).toBeDefined(); // First
    expect(buttons[1].attributes("disabled")).toBeDefined(); // Prev
  });

  it("disables Next/Last buttons on last page", () => {
    const wrapper = factory({ page: 5, totalPages: 5 });
    const buttons = wrapper.findAll("button");
    const next = buttons.find((b) => b.attributes("aria-label") === "Next page");
    const last = buttons.find((b) => b.attributes("aria-label") === "Last page");
    expect(next.attributes("disabled")).toBeDefined();
    expect(last.attributes("disabled")).toBeDefined();
  });

  it("emits update:page when clicking page number", async () => {
    const wrapper = factory({ page: 1, totalPages: 5 });
    const pageBtn = wrapper.findAll("button").find((b) => b.text() === "3");
    await pageBtn.trigger("click");
    expect(wrapper.emitted("update:page")[0]).toEqual([3]);
  });

  it("computes visiblePages correctly for <= 7 pages", () => {
    const wrapper = factory({ page: 1, totalPages: 5, total: 125 });
    const pageButtons = wrapper.findAll("button.btn-page").filter((b) => /^\d+$/.test(b.text().trim()));
    expect(pageButtons).toHaveLength(5);
  });

  it("computes visiblePages with ellipsis for many pages", () => {
    const wrapper = factory({ page: 5, totalPages: 20, total: 500 });
    expect(wrapper.text()).toContain("...");
  });

  it("startRecord is 0 when total is 0", () => {
    const wrapper = factory({ page: 1, totalPages: 0, total: 0 });
    expect(wrapper.text()).toContain("Showing 0 to 0 of 0 records");
  });
});
