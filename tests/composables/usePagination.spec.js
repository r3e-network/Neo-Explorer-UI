import { usePagination } from "@/composables/usePagination";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: {} }),
  useRouter: () => ({ replace: vi.fn() }),
}));

describe("usePagination", () => {
  describe("initial state", () => {
    it("does not register lifecycle hooks when used outside setup", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      usePagination(vi.fn());
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("returns correct default initial state", () => {
      const fetchFn = vi.fn();
      const p = usePagination(fetchFn);

      expect(p.items.value).toEqual([]);
      expect(p.loading.value).toBe(false);
      expect(p.error.value).toBeNull();
      expect(p.totalCount.value).toBe(0);
      expect(p.currentPage.value).toBe(1);
      expect(p.pageSize.value).toBe(25); // DEFAULT_PAGE_SIZE
    });

    it("accepts custom defaultPageSize", () => {
      const p = usePagination(vi.fn(), { defaultPageSize: 10 });
      expect(p.pageSize.value).toBe(10);
    });
  });

  describe("computed properties", () => {
    it("totalPages defaults to 1 when totalCount is 0", () => {
      const p = usePagination(vi.fn());
      expect(p.totalPages.value).toBe(1);
    });

    it("computes totalPages correctly", async () => {
      const fetchFn = vi.fn().mockResolvedValue({ result: [], totalCount: 100 });
      const p = usePagination(fetchFn, { defaultPageSize: 10 });

      await p.loadPage(1);
      expect(p.totalPages.value).toBe(10);
    });

    it("computes totalPages with remainder", async () => {
      const fetchFn = vi.fn().mockResolvedValue({ result: [], totalCount: 27 });
      const p = usePagination(fetchFn, { defaultPageSize: 10 });

      await p.loadPage(1);
      expect(p.totalPages.value).toBe(3);
    });

    it("computes startRecord and endRecord for page 1", async () => {
      const fetchFn = vi.fn().mockResolvedValue({ result: new Array(10), totalCount: 55 });
      const p = usePagination(fetchFn, { defaultPageSize: 10 });

      await p.loadPage(1);
      expect(p.startRecord.value).toBe(1);
      expect(p.endRecord.value).toBe(10);
    });

    it("computes startRecord and endRecord for middle page", async () => {
      const fetchFn = vi.fn().mockResolvedValue({ result: new Array(10), totalCount: 55 });
      const p = usePagination(fetchFn, { defaultPageSize: 10 });

      await p.loadPage(3);
      expect(p.startRecord.value).toBe(21);
      expect(p.endRecord.value).toBe(30);
    });

    it("endRecord is capped at totalCount on last page", async () => {
      const fetchFn = vi.fn().mockResolvedValue({ result: new Array(5), totalCount: 55 });
      const p = usePagination(fetchFn, { defaultPageSize: 10 });

      await p.loadPage(6);
      expect(p.startRecord.value).toBe(51);
      expect(p.endRecord.value).toBe(55);
    });

    it("startRecord is 0 when totalCount is 0", () => {
      const p = usePagination(vi.fn());
      expect(p.startRecord.value).toBe(0);
    });
  });

  describe("loadPage()", () => {
    it("calls fetchFn with correct pageSize and skip", async () => {
      const fetchFn = vi.fn().mockResolvedValue({ result: ["a"], totalCount: 50 });
      const p = usePagination(fetchFn, { defaultPageSize: 10 });

      await p.loadPage(3);
      expect(fetchFn).toHaveBeenCalledWith(
        10,
        20,
        expect.objectContaining({ forceRefresh: false, network: "mainnet" }),
      );
    });

    it("sets loading during fetch", async () => {
      let resolveFn;
      const fetchFn = vi.fn(
        () =>
          new Promise((r) => {
            resolveFn = r;
          })
      );
      const p = usePagination(fetchFn);

      const promise = p.loadPage(1);
      expect(p.loading.value).toBe(true);

      await Promise.resolve();
      resolveFn({ result: [], totalCount: 0 });
      await promise;
      expect(p.loading.value).toBe(false);
    });

    it("stores items and totalCount from response", async () => {
      const fetchFn = vi.fn().mockResolvedValue({ result: ["x", "y"], totalCount: 42 });
      const p = usePagination(fetchFn);

      await p.loadPage(1);
      expect(p.items.value).toEqual(["x", "y"]);
      expect(p.totalCount.value).toBe(42);
    });

    it("updates currentPage on success", async () => {
      const fetchFn = vi.fn().mockResolvedValue({ result: [], totalCount: 100 });
      const p = usePagination(fetchFn, { defaultPageSize: 10 });

      await p.loadPage(5);
      expect(p.currentPage.value).toBe(5);
    });

    it("handles null/undefined response gracefully", async () => {
      const fetchFn = vi.fn().mockResolvedValue(null);
      const p = usePagination(fetchFn);

      await p.loadPage(1);
      expect(p.items.value).toEqual([]);
      expect(p.totalCount.value).toBe(0);
    });
  });

  describe("error handling", () => {
    it("sets error string on fetch failure", async () => {
      const fetchFn = vi.fn().mockRejectedValue(new Error("network"));
      const p = usePagination(fetchFn);

      vi.spyOn(console, "error").mockImplementation(() => {});
      await p.loadPage(1);
      console.error.mockRestore();

      expect(p.error.value).toBe("errors.generic");
      expect(p.items.value).toEqual([]);
      expect(p.loading.value).toBe(false);
    });

    it("clears loading and surfaces the configured error when a page request times out", async () => {
      vi.useFakeTimers();
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      try {
        const fetchFn = vi.fn(() => new Promise(() => {}));
        const p = usePagination(fetchFn, { errorMessage: "Failed to load", timeoutMs: 25 });

        const promise = p.loadPage(1);
        expect(p.loading.value).toBe(true);

        await vi.advanceTimersByTimeAsync(25);
        await promise;

        expect(p.error.value).toBe("Failed to load");
        expect(p.items.value).toEqual([]);
        expect(p.loading.value).toBe(false);
      } finally {
        errorSpy.mockRestore();
        vi.useRealTimers();
      }
    });
  });

  describe("goToPage()", () => {
    it("loads valid page within range", async () => {
      const fetchFn = vi.fn().mockResolvedValue({ result: [], totalCount: 100 });
      const p = usePagination(fetchFn, { defaultPageSize: 10 });

      await p.loadPage(1);
      fetchFn.mockClear();

      await p.goToPage(5);
      expect(fetchFn).toHaveBeenCalledWith(10, 40, expect.objectContaining({ forceRefresh: false }));
    });

    it("ignores page < 1", async () => {
      const fetchFn = vi.fn().mockResolvedValue({ result: [], totalCount: 50 });
      const p = usePagination(fetchFn, { defaultPageSize: 10 });

      await p.loadPage(1);
      fetchFn.mockClear();

      p.goToPage(0);
      p.goToPage(-1);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("ignores page > totalPages", async () => {
      const fetchFn = vi.fn().mockResolvedValue({ result: [], totalCount: 50 });
      const p = usePagination(fetchFn, { defaultPageSize: 10 });

      await p.loadPage(1);
      fetchFn.mockClear();

      p.goToPage(999);
      expect(fetchFn).not.toHaveBeenCalled();
    });
  });

  describe("changePageSize()", () => {
    it("updates pageSize and reloads page 1", async () => {
      const fetchFn = vi.fn().mockResolvedValue({ result: [], totalCount: 100 });
      const p = usePagination(fetchFn, { defaultPageSize: 25 });

      await p.loadPage(3);
      fetchFn.mockClear();

      await p.changePageSize(50);
      expect(p.pageSize.value).toBe(50);
      expect(fetchFn).toHaveBeenCalledWith(50, 0, expect.objectContaining({ forceRefresh: false }));
    });
  });

  describe("abort handling", () => {
    it("does not surface AbortError as a user-facing failure", async () => {
      const abortErr = new Error("aborted");
      abortErr.name = "AbortError";
      const fetchFn = vi.fn().mockRejectedValue(abortErr);

      const p = usePagination(fetchFn, { errorMessage: "Failed to load" });
      await p.loadPage(1);

      expect(p.error.value).toBeNull();
      expect(p.items.value).toEqual([]);
    });

    it("does not surface ERR_CANCELED as a user-facing failure", async () => {
      const cancelErr = Object.assign(new Error("canceled"), { code: "ERR_CANCELED" });
      const fetchFn = vi.fn().mockRejectedValue(cancelErr);

      const p = usePagination(fetchFn, { errorMessage: "Failed to load" });
      await p.loadPage(1);

      expect(p.error.value).toBeNull();
    });

    it("still surfaces real fetch errors", async () => {
      const fetchFn = vi.fn().mockRejectedValue(new Error("500 internal"));
      const p = usePagination(fetchFn, { errorMessage: "Failed to load transactions" });

      await p.loadPage(1);

      expect(p.error.value).toBe("Failed to load transactions");
    });
  });

  describe("maxOffset cap", () => {
    it("caps totalPages at the last reachable page within the offset window", async () => {
      // maxOffset 2000 / pageSize 25 => last reachable skip 2000 is page 81.
      const fetchFn = vi.fn().mockResolvedValue({ result: new Array(25), totalCount: 1_000_000 });
      const p = usePagination(fetchFn, { defaultPageSize: 25, maxOffset: 2000 });

      await p.loadPage(1);
      expect(p.totalPages.value).toBe(81);
    });

    it("flags offsetCapped only when there is more data than the window can reach", async () => {
      const capped = usePagination(vi.fn().mockResolvedValue({ result: new Array(25), totalCount: 1_000_000 }), {
        defaultPageSize: 25,
        maxOffset: 2000,
      });
      await capped.loadPage(1);
      expect(capped.offsetCapped.value).toBe(true);

      const withinWindow = usePagination(vi.fn().mockResolvedValue({ result: new Array(25), totalCount: 100 }), {
        defaultPageSize: 25,
        maxOffset: 2000,
      });
      await withinWindow.loadPage(1);
      expect(withinWindow.offsetCapped.value).toBe(false);
    });

    it("clamps currentPage to the cap when navigating past the offset window", async () => {
      const fetchFn = vi.fn().mockResolvedValue({ result: new Array(25), totalCount: 1_000_000 });
      const p = usePagination(fetchFn, { defaultPageSize: 25, maxOffset: 2000 });

      await p.loadPage(500);
      expect(p.currentPage.value).toBe(81);
    });

    it("does not cap or flag when maxOffset is unset", async () => {
      const fetchFn = vi.fn().mockResolvedValue({ result: new Array(25), totalCount: 1_000_000 });
      const p = usePagination(fetchFn, { defaultPageSize: 25 });

      await p.loadPage(1);
      expect(p.totalPages.value).toBe(40000);
      expect(p.offsetCapped.value).toBe(false);
    });
  });

  describe("race condition guard", () => {
    it("discards stale responses from earlier requests", async () => {
      let callIndex = 0;
      const fetchFn = vi.fn(() => {
        const idx = ++callIndex;
        if (idx === 1) {
          return new Promise((r) => setTimeout(() => r({ result: ["stale"], totalCount: 1 }), 50));
        }
        return Promise.resolve({ result: ["fresh"], totalCount: 2 });
      });

      const p = usePagination(fetchFn);

      const first = p.loadPage(1);
      const second = p.loadPage(2);

      await second;
      expect(p.items.value).toEqual(["fresh"]);
      expect(p.totalCount.value).toBe(2);

      await first;
      expect(p.items.value).toEqual(["fresh"]);
      expect(p.totalCount.value).toBe(2);
    });
  });
});
