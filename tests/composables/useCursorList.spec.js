import { describe, it, expect, vi, afterEach } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { useCursorList } from "../../src/composables/useCursorList.js";

const mountedWrappers = new Set();

// Mount the composable inside a throwaway component so its onMounted/
// onBeforeUnmount lifecycle actually runs.
function mountCursorList(fetchPage) {
  let api;
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useCursorList(fetchPage);
        return () => h("div");
      },
    }),
  );
  mountedWrappers.add(wrapper);
  return { api, wrapper };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  for (const wrapper of mountedWrappers) {
    try {
      wrapper.unmount();
    } catch {
      // Already unmounted by the test.
    }
  }
  mountedWrappers.clear();
  vi.useRealTimers();
});

describe("useCursorList", () => {
  it("loads the first page on mount and exposes cursor state", async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      items: [{ hash: "0xa" }, { hash: "0xb" }],
      nextPageParams: { items_count: 50 },
    });
    const { api } = mountCursorList(fetchPage);
    await flush();
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage.mock.calls[0][0]).toBeNull(); // first page has no cursor
    expect(api.items.value.map((i) => i.hash)).toEqual(["0xa", "0xb"]);
    expect(api.hasMore.value).toBe(true);
    expect(api.loading.value).toBe(false);
  });

  it("appends deduped items on loadMore and passes the cursor back", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [{ hash: "0xa" }], nextPageParams: { p: 2 } })
      .mockResolvedValueOnce({ items: [{ hash: "0xa" }, { hash: "0xc" }], nextPageParams: null });
    const { api } = mountCursorList(fetchPage);
    await flush();
    await api.loadMore();
    expect(fetchPage.mock.calls[1][0]).toEqual({ p: 2 });
    expect(api.items.value.map((i) => i.hash)).toEqual(["0xa", "0xc"]); // 0xa deduped
    expect(api.hasMore.value).toBe(false);
  });

  it("dedupes block rows by index and address rows by contractHash", async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      items: [{ index: 1 }, { index: 1 }, { contractHash: "0xt" }, { contractHash: "0xt" }],
      nextPageParams: null,
    });
    const { api } = mountCursorList(fetchPage);
    await flush();
    expect(api.items.value).toHaveLength(2);
  });

  it("keeps loaded items when a load-more page fails and cools down retries", async () => {
    vi.useFakeTimers();
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [{ hash: "0xa" }], nextPageParams: { p: 2 } })
      .mockRejectedValueOnce(new Error("upstream 502"))
      .mockResolvedValueOnce({ items: [{ hash: "0xb" }], nextPageParams: null });
    const { api } = mountCursorList(fetchPage);
    await vi.runOnlyPendingTimersAsync();
    await api.loadMore(); // fails
    expect(api.items.value.map((i) => i.hash)).toEqual(["0xa"]); // list NOT wiped
    expect(api.error.value).toBeNull(); // initial-load error stays clear
    expect(api.hasMore.value).toBe(true); // footer remains a retry affordance

    await api.loadMore(); // within cooldown → ignored
    expect(fetchPage).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(4100);
    await api.loadMore(); // after cooldown → retries
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(api.items.value.map((i) => i.hash)).toEqual(["0xa", "0xb"]);
  });

  it("sets error only when the initial load fails", async () => {
    const fetchPage = vi.fn().mockRejectedValue(new Error("down"));
    const { api } = mountCursorList(fetchPage);
    await flush();
    expect(api.error.value).toBeInstanceOf(Error);
    expect(api.items.value).toEqual([]);
  });

  it("refresh() resets the list and re-fetches from page one", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [{ hash: "0xa" }], nextPageParams: { p: 2 } })
      .mockResolvedValueOnce({ items: [{ hash: "0xz" }], nextPageParams: null });
    const { api } = mountCursorList(fetchPage);
    await flush();
    await api.refresh();
    await nextTick();
    expect(fetchPage.mock.calls[1][0]).toBeNull();
    expect(api.items.value.map((i) => i.hash)).toEqual(["0xz"]);
  });

  it("clears rows synchronously when the selected network changes", async () => {
    let resolveNext;
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [{ hash: "0xmainnet" }], nextPageParams: { p: 2 } })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveNext = resolve;
          })
      );
    const { api } = mountCursorList(fetchPage);
    await flush();

    window.dispatchEvent(new CustomEvent("neo-explorer-network-change"));

    expect(api.items.value).toEqual([]);
    expect(api.hasMore.value).toBe(false);
    expect(api.loading.value).toBe(true);

    resolveNext({ items: [{ hash: "0xtestnet" }], nextPageParams: null });
    await flush();
    expect(api.items.value.map((item) => item.hash)).toEqual(["0xtestnet"]);
  });

  it("a superseded slow response never overwrites the newer one", async () => {
    let resolveFirst;
    const first = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const fetchPage = vi
      .fn()
      .mockImplementationOnce(() => first)
      .mockResolvedValueOnce({ items: [{ hash: "0xnew" }], nextPageParams: null });
    const { api } = mountCursorList(fetchPage);
    const refreshed = api.refresh(); // supersedes the mount load
    resolveFirst({ items: [{ hash: "0xstale" }], nextPageParams: { p: 9 } });
    await refreshed;
    await flush();
    expect(api.items.value.map((i) => i.hash)).toEqual(["0xnew"]);
    expect(api.hasMore.value).toBe(false);
  });

  it("aborts the in-flight request on unmount", async () => {
    let capturedSignal;
    const fetchPage = vi.fn().mockImplementation((_cursor, { signal }) => {
      capturedSignal = signal;
      return new Promise(() => {});
    });
    const { wrapper } = mountCursorList(fetchPage);
    await nextTick();
    expect(capturedSignal.aborted).toBe(false);
    wrapper.unmount();
    expect(capturedSignal.aborted).toBe(true);
  });
});
