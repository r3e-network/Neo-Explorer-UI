import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchFreshQueryMock } = vi.hoisted(() => ({
  fetchFreshQueryMock: vi.fn(async ({ queryFn, forceRefresh }) => queryFn({ forceRefresh })),
}));

vi.mock("@/query/freshness", () => ({
  fetchFreshQuery: fetchFreshQueryMock,
}));

describe("useLoadMore fresh query integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes appended pages through the shared query layer when queryKeyFn is provided", async () => {
    const { useLoadMore } = await import("@/composables/useLoadMore");
    const fetchPage = vi.fn(async (_limit, _skip, options) => ({
      result: [{ hash: options.forceRefresh ? "fresh-next" : "cached-next" }],
      totalCount: 20,
    }));
    const pagination = {
      items: ref([{ hash: "existing" }]),
      currentPage: ref(1),
      pageSize: ref(10),
      totalPages: ref(2),
      totalCount: ref(11),
    };

    const { loadMore } = useLoadMore(fetchPage, pagination, {
      queryKeyFn: (limit, skip) => ["load-more", limit, skip],
      querySource: "test-load-more",
      queryStaleTime: 9_000,
    });

    await loadMore();

    expect(fetchFreshQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        forceRefresh: true,
        queryKey: ["load-more", 10, 10],
        source: "test-load-more",
        staleTime: 9_000,
      }),
    );
    expect(fetchPage).toHaveBeenCalledWith(10, 10, {
      forceRefresh: true,
      network: "mainnet",
    });
    expect(pagination.items.value).toEqual([{ hash: "existing" }, { hash: "fresh-next" }]);
  });
});
