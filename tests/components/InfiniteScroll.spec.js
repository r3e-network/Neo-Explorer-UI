import { mount, config } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import InfiniteScroll from "@/components/common/InfiniteScroll.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

config.global.mocks = { ...(config.global.mocks || {}), $t: (k) => k };

const originalIntersectionObserver = window.IntersectionObserver;

afterEach(() => {
  if (originalIntersectionObserver === undefined) {
    delete window.IntersectionObserver;
  } else {
    window.IntersectionObserver = originalIntersectionObserver;
  }
  vi.useRealTimers();
});

describe("InfiniteScroll", () => {
  it("renders an accessible fallback button when more rows are available", async () => {
    const wrapper = mount(InfiniteScroll, {
      props: { loading: false, hasMore: true },
      global: { mocks: { $t: (key) => key } },
    });

    const button = wrapper.find("button");
    expect(button.exists()).toBe(true);
    expect(button.text()).toBe("common.loadMore");

    await button.trigger("click");
    expect(wrapper.emitted("load-more")).toHaveLength(1);
  });

  it("keeps the loading status state", () => {
    const wrapper = mount(InfiniteScroll, {
      props: { loading: true, hasMore: true },
      global: { mocks: { $t: (key) => key } },
    });

    expect(wrapper.find('[role="status"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("common.loadingMore");
  });

  it("shows the end state when no more rows are available", () => {
    const wrapper = mount(InfiniteScroll, {
      props: { loading: false, hasMore: false },
      global: { mocks: { $t: (key) => key } },
    });

    expect(wrapper.text()).toContain("common.noMoreItems");
    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("supports button-only pagination without creating an observer", async () => {
    const observer = vi.fn();
    window.IntersectionObserver = observer;
    const wrapper = mount(InfiniteScroll, {
      props: { auto: false, loading: false, hasMore: true },
      global: { mocks: { $t: (key) => key } },
    });

    expect(observer).not.toHaveBeenCalled();
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("load-more")).toHaveLength(1);
  });

  it("auto-loads only once until the sentinel leaves and re-enters the viewport", async () => {
    vi.useFakeTimers();
    let callback;
    window.IntersectionObserver = class {
      constructor(next) {
        callback = next;
      }
      observe() {}
      disconnect() {}
    };

    const wrapper = mount(InfiniteScroll, {
      props: { loading: false, hasMore: true },
      global: { mocks: { $t: (key) => key } },
    });

    callback([{ isIntersecting: true }]);
    callback([{ isIntersecting: true }]);
    expect(wrapper.emitted("load-more")).toHaveLength(1);

    callback([{ isIntersecting: false }]);
    vi.advanceTimersByTime(700);
    callback([{ isIntersecting: true }]);
    expect(wrapper.emitted("load-more")).toHaveLength(2);
  });
});
