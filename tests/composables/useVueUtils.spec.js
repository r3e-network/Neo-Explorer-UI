import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("vue", async () => {
  const actual = await vi.importActual("vue");
  return {
    ...actual,
    getCurrentInstance: () => null,
    onMounted: vi.fn((cb) => cb()),
    onUnmounted: vi.fn(),
  };
});

import { useDebounceFn } from "@/composables/useVueUtils";

describe("useVueUtils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("useDebounceFn", () => {
    it("delays function execution", () => {
      const fn = vi.fn();
      const { debouncedFn } = useDebounceFn(fn, 100);

      debouncedFn("a");
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith("a");
    });

    it("cancel prevents execution", () => {
      const fn = vi.fn();
      const { debouncedFn, cancel } = useDebounceFn(fn, 100);

      debouncedFn();
      cancel();
      vi.advanceTimersByTime(200);
      expect(fn).not.toHaveBeenCalled();
    });

    it("flush executes immediately", () => {
      const fn = vi.fn();
      const { debouncedFn, flush } = useDebounceFn(fn, 100);

      debouncedFn("delayed");
      flush("immediate");
      expect(fn).toHaveBeenCalledWith("immediate");
    });

    it("resets timer on repeated calls", () => {
      const fn = vi.fn();
      const { debouncedFn } = useDebounceFn(fn, 100);

      debouncedFn("a");
      vi.advanceTimersByTime(50);
      debouncedFn("b");
      vi.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledWith("b");
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
