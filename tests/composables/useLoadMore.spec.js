import { ref } from "vue";
import { useLoadMore } from "@/composables/useLoadMore";

function makePagination(overrides = {}) {
  return {
    items: ref([]),
    currentPage: ref(1),
    pageSize: ref(10),
    totalPages: ref(5),
    totalCount: ref(50),
    ...overrides,
  };
}

describe("useLoadMore", () => {
  describe("initial state", () => {
    it("loadingMore is false", () => {
      const { loadingMore } = useLoadMore(vi.fn(), makePagination());
      expect(loadingMore.value).toBe(false);
    });
  });

  describe("loadMore()", () => {
    it("calls fetchFn with correct pageSize, skip, and forceRefresh", async () => {
      const fetchFn = vi.fn().mockResolvedValue({ result: ["a"], totalCount: 50 });
      const pagination = makePagination({ currentPage: ref(2), pageSize: ref(10) });
      const { loadMore } = useLoadMore(fetchFn, pagination);

      await loadMore();
      expect(fetchFn).toHaveBeenCalledWith(10, 20, { forceRefresh: true });
    });

    it("appends items to existing array", async () => {
      const fetchFn = vi.fn().mockResolvedValue({ result: ["c", "d"], totalCount: 50 });
      const pagination = makePagination({ items: ref(["a", "b"]) });
      const { loadMore } = useLoadMore(fetchFn, pagination);

      await loadMore();
      expect(pagination.items.value).toEqual(["a", "b", "c", "d"]);
    });

    it("increments currentPage", async () => {
      const fetchFn = vi.fn().mockResolvedValue({ result: ["x"], totalCount: 50 });
      const pagination = makePagination({ currentPage: ref(2) });
      const { loadMore } = useLoadMore(fetchFn, pagination);

      await loadMore();
      expect(pagination.currentPage.value).toBe(3);
    });

    it("updates totalCount from response", async () => {
      const fetchFn = vi.fn().mockResolvedValue({ result: ["x"], totalCount: 99 });
      const pagination = makePagination({ totalCount: ref(50) });
      const { loadMore } = useLoadMore(fetchFn, pagination);

      await loadMore();
      expect(pagination.totalCount.value).toBe(99);
    });

    it("calls onAppend callback with new items", async () => {
      const onAppend = vi.fn();
      const fetchFn = vi.fn().mockResolvedValue({ result: ["a", "b"], totalCount: 50 });
      const { loadMore } = useLoadMore(fetchFn, makePagination(), { onAppend });

      await loadMore();
      expect(onAppend).toHaveBeenCalledWith(["a", "b"]);
    });
  });

  describe("guard conditions", () => {
    it("does nothing when already at last page", async () => {
      const fetchFn = vi.fn();
      const pagination = makePagination({ currentPage: ref(5), totalPages: ref(5) });
      const { loadMore } = useLoadMore(fetchFn, pagination);

      await loadMore();
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("does nothing when already loading", async () => {
      let resolveFn;
      const fetchFn = vi.fn(
        () =>
          new Promise((r) => {
            resolveFn = r;
          })
      );
      const pagination = makePagination();
      const { loadMore } = useLoadMore(fetchFn, pagination);

      const first = loadMore();
      await loadMore();
      expect(fetchFn).toHaveBeenCalledTimes(1);

      resolveFn({ result: [], totalCount: 0 });
      await first;
    });
  });

  describe("race condition guard", () => {
    it("discards stale responses", async () => {
      let resolveFirst;
      const fetchFn = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((r) => {
              resolveFirst = r;
            })
        )
        .mockImplementationOnce(() => Promise.resolve({ result: ["fresh"], totalCount: 2 }));

      const pagination = makePagination();
      const { loadMore, loadingMore } = useLoadMore(fetchFn, pagination);

      const first = loadMore();
      loadingMore.value = false;
      const second = loadMore();

      await second;
      expect(pagination.items.value).toEqual(["fresh"]);

      resolveFirst({ result: ["stale"], totalCount: 1 });
      await first;
      expect(pagination.items.value).toEqual(["fresh"]);
    });
  });

  describe("error handling", () => {
    it("handles fetch error gracefully", async () => {
      const fetchFn = vi.fn().mockRejectedValue(new Error("network"));
      const pagination = makePagination();
      const { loadMore, loadingMore } = useLoadMore(fetchFn, pagination);

      vi.spyOn(console, "error").mockImplementation(() => {});
      await loadMore();
      console.error.mockRestore();

      expect(loadingMore.value).toBe(false);
      expect(pagination.items.value).toEqual([]);
    });
  });
});
