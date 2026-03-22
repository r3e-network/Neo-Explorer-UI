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

import { useDebounceFn, useThrottleFn, useDebouncedRef } from "@/composables/useVueUtils";
import { ref } from "vue";

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

  describe("useThrottleFn", () => {
    it("executes immediately on first call", () => {
      const fn = vi.fn();
      const { throttledFn } = useThrottleFn(fn, 100);

      throttledFn("first");
      expect(fn).toHaveBeenCalledWith("first");
    });

    it("throttles subsequent calls", () => {
      const fn = vi.fn();
      const { throttledFn } = useThrottleFn(fn, 100);

      throttledFn("first");
      throttledFn("second");
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith("second");
    });

    it("cancel stops pending execution", () => {
      const fn = vi.fn();
      const { throttledFn, cancel } = useThrottleFn(fn, 100);

      throttledFn("first");
      throttledFn("second");
      cancel();
      vi.advanceTimersByTime(200);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe("useDebouncedRef", () => {
    it("initializes with source value", () => {
      const source = ref("hello");
      const { value } = useDebouncedRef(source, 100);
      expect(value.value).toBe("hello");
    });

    it("updates value after delay", () => {
      const source = ref("hello");
      const { value, update } = useDebouncedRef(source, 100);

      update("world");
      expect(value.value).toBe("hello");

      vi.advanceTimersByTime(100);
      expect(value.value).toBe("world");
    });
  });
});
