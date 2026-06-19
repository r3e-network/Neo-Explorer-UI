import { defineComponent } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePagination } from "@/composables/usePagination";

const { fetchFreshQueryMock, pushMock } = vi.hoisted(() => ({
  fetchFreshQueryMock: vi.fn(async ({ queryFn, forceRefresh }) => queryFn({ forceRefresh })),
  pushMock: vi.fn(),
}));

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: {} }),
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

vi.mock("@/query/freshness", () => ({
  fetchFreshQuery: fetchFreshQueryMock,
}));

describe("usePagination fresh query integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes page loads through the shared query layer when queryKeyFn is provided", async () => {
    const fetchPage = vi.fn(async (_limit, _skip, options) => ({
      result: [{ hash: options.forceRefresh ? "fresh" : "cached" }],
      totalCount: 1,
    }));

    const Host = defineComponent({
      setup() {
        const state = usePagination(fetchPage, {
          defaultPageSize: 10,
          queryKeyFn: (limit, skip) => ["page", limit, skip],
          querySource: "test-page",
          queryStaleTime: 12_000,
        });
        return { state };
      },
      template: "<div />",
    });

    const wrapper = mount(Host);
    await flushPromises();

    await wrapper.vm.state.loadPage(1, { forceRefresh: true });
    await flushPromises();

    expect(fetchFreshQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        forceRefresh: true,
        queryKey: ["page", 10, 0],
        source: "test-page",
        staleTime: 12_000,
      }),
    );
    expect(fetchPage).toHaveBeenCalledWith(10, 0, { forceRefresh: true });
    expect(wrapper.vm.state.items.value).toEqual([{ hash: "fresh" }]);
  });
});
