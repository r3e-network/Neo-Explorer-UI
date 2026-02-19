import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/constants", () => ({ COPY_FEEDBACK_TIMEOUT_MS: 2000 }));

import CopyButton from "@/components/common/CopyButton.vue";

describe("CopyButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue() } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders without error", () => {
    const wrapper = mount(CopyButton);
    expect(wrapper.find("button").exists()).toBe(true);
  });

  it("does nothing when text is empty", async () => {
    const wrapper = mount(CopyButton, { props: { text: "" } });
    await wrapper.find("button").trigger("click");
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it("copies text to clipboard on click", async () => {
    const wrapper = mount(CopyButton, { props: { text: "0xabc" } });
    await wrapper.find("button").trigger("click");
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("0xabc");
  });

  it("shows copied state after successful copy", async () => {
    const wrapper = mount(CopyButton, { props: { text: "hello" } });
    await wrapper.find("button").trigger("click");
    await vi.dynamicImportSettled();
    expect(wrapper.find("button").attributes("title")).toBe("Copied!");
    const tooltip = wrapper.find('[role="tooltip"]');
    expect(tooltip.exists()).toBe(true);
    expect(wrapper.find("button").attributes("aria-describedby")).toBe(tooltip.attributes("id"));
  });

  it("handles clipboard failure gracefully", async () => {
    navigator.clipboard.writeText = vi.fn().mockRejectedValue(new Error("fail"));
    const wrapper = mount(CopyButton, { props: { text: "hello" } });
    await wrapper.find("button").trigger("click");
    await vi.dynamicImportSettled();
    expect(wrapper.find("button").attributes("title")).toBe("Copy failed");
  });

  it("cleans up timer on unmount", async () => {
    const spy = vi.spyOn(global, "clearTimeout");
    const wrapper = mount(CopyButton, { props: { text: "hello" } });
    await wrapper.find("button").trigger("click");
    await vi.dynamicImportSettled();
    wrapper.unmount();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("updates screen-reader live text for feedback", async () => {
    const wrapper = mount(CopyButton, { props: { text: "hello" } });
    await wrapper.find("button").trigger("click");
    await vi.dynamicImportSettled();
    const liveRegion = wrapper.find('span[aria-live="polite"]');
    expect(liveRegion.exists()).toBe(true);
    expect(liveRegion.text()).toContain("Copied to clipboard");
  });
});
