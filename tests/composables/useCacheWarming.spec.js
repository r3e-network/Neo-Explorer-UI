import { useCacheWarming } from "@/composables/useCacheWarming";

vi.mock("vue", async () => {
  const actual = await vi.importActual("vue");
  return {
    ...actual,
    onBeforeUnmount: vi.fn(),
    getCurrentInstance: vi.fn(() => null),
  };
});

const { blockServiceMock, statsServiceMock } = vi.hoisted(() => ({
  blockServiceMock: { getList: vi.fn(), getCount: vi.fn() },
  statsServiceMock: { getDashboardStats: vi.fn() },
}));

vi.mock("@/services", () => ({
  blockService: blockServiceMock,
  statsService: statsServiceMock,
}));

function flushPromises() {
  return new Promise((r) => queueMicrotask(() => queueMicrotask(r)));
}

describe("useCacheWarming", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    blockServiceMock.getList.mockReset().mockResolvedValue([]);
    blockServiceMock.getCount.mockReset().mockResolvedValue(0);
    statsServiceMock.getDashboardStats.mockReset().mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("warmCriticalCache", () => {
    it("fires all 3 critical service calls on first run", async () => {
      const { warmCriticalCache, isWarmedUp } = useCacheWarming();
      expect(isWarmedUp.value).toBe(false);
      await warmCriticalCache();
      expect(blockServiceMock.getList).toHaveBeenCalledWith(1, 0);
      expect(blockServiceMock.getCount).toHaveBeenCalledTimes(1);
      expect(statsServiceMock.getDashboardStats).toHaveBeenCalledTimes(1);
      expect(isWarmedUp.value).toBe(true);
    });

    it("is idempotent — second call short-circuits", async () => {
      const { warmCriticalCache } = useCacheWarming();
      await warmCriticalCache();
      blockServiceMock.getList.mockClear();
      blockServiceMock.getCount.mockClear();
      statsServiceMock.getDashboardStats.mockClear();
      await warmCriticalCache();
      expect(blockServiceMock.getList).not.toHaveBeenCalled();
      expect(blockServiceMock.getCount).not.toHaveBeenCalled();
      expect(statsServiceMock.getDashboardStats).not.toHaveBeenCalled();
    });

    it("does not throw when service calls reject (Promise.allSettled)", async () => {
      blockServiceMock.getList.mockRejectedValue(new Error("boom"));
      blockServiceMock.getCount.mockRejectedValue(new Error("kaboom"));
      const { warmCriticalCache, isWarmedUp } = useCacheWarming();
      await expect(warmCriticalCache()).resolves.toBeUndefined();
      // isWarmedUp is set after successful settle of the allSettled call
      expect(isWarmedUp.value).toBe(true);
    });
  });

  describe("prefetch", () => {
    it("awaits the fetcher when priority is high", async () => {
      const { prefetch } = useCacheWarming();
      const fetcher = vi.fn().mockResolvedValue("v");
      await prefetch("k1", fetcher, "high");
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("defers low-priority fetcher behind a 100ms debounce", async () => {
      const { prefetch } = useCacheWarming();
      const fetcher = vi.fn().mockResolvedValue("v");
      prefetch("k2", fetcher, "low");
      expect(fetcher).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(99);
      expect(fetcher).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(2);
      await flushPromises();
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("dedupes prefetch by key — same key fetched once until the queue drains", async () => {
      const { prefetch } = useCacheWarming();
      const fetcher = vi.fn().mockResolvedValue("v");
      prefetch("dup", fetcher, "low");
      prefetch("dup", fetcher, "low");
      await vi.advanceTimersByTimeAsync(150);
      await flushPromises();
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe("prefetchNextPage", () => {
    it("does NOT prefetch when on last page", async () => {
      const { prefetchNextPage } = useCacheWarming();
      const fetchFn = vi.fn().mockResolvedValue([]);
      await prefetchNextPage(2, 3, fetchFn);
      await vi.advanceTimersByTimeAsync(200);
      await flushPromises();
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("schedules a low-priority fetch for the next page", async () => {
      const { prefetchNextPage } = useCacheWarming();
      const fetchFn = vi.fn().mockResolvedValue([]);
      await prefetchNextPage(1, 5, fetchFn);
      // fetch is debounced 100ms before firing
      await vi.advanceTimersByTimeAsync(150);
      await flushPromises();
      expect(fetchFn).toHaveBeenCalledWith(2);
    });
  });
});
