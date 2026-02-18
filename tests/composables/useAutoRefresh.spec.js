import { ref, onBeforeUnmount } from "vue";
import { useAutoRefresh } from "@/composables/useAutoRefresh";

vi.mock("@/utils/env", () => ({
  getNetworkRefreshIntervalMs: () => 15000,
}));

vi.mock("vue", async () => {
  const actual = await vi.importActual("vue");
  return { ...actual, onBeforeUnmount: vi.fn() };
});

describe("useAutoRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("isActive is false", () => {
      const { isActive } = useAutoRefresh(vi.fn());
      expect(isActive.value).toBe(false);
    });
  });

  describe("start()", () => {
    it("sets isActive to true and calls callback on interval", () => {
      const cb = vi.fn();
      const { start, isActive } = useAutoRefresh(cb);

      start();
      expect(isActive.value).toBe(true);
      expect(cb).not.toHaveBeenCalled();

      vi.advanceTimersByTime(15000);
      expect(cb).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(15000);
      expect(cb).toHaveBeenCalledTimes(2);
    });
  });

  describe("stop()", () => {
    it("clears interval and sets isActive to false", () => {
      const cb = vi.fn();
      const { start, stop, isActive } = useAutoRefresh(cb);

      start();
      stop();
      expect(isActive.value).toBe(false);

      vi.advanceTimersByTime(30000);
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe("options", () => {
    it("immediate option starts automatically", () => {
      const cb = vi.fn();
      const { isActive } = useAutoRefresh(cb, { immediate: true });

      expect(isActive.value).toBe(true);
      vi.advanceTimersByTime(15000);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("custom intervalMs is used", () => {
      const cb = vi.fn();
      const { start } = useAutoRefresh(cb, { intervalMs: 5000 });

      start();
      vi.advanceTimersByTime(5000);
      expect(cb).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(5000);
      expect(cb).toHaveBeenCalledTimes(2);
    });

    it("uses getNetworkRefreshIntervalMs when no custom interval", () => {
      const cb = vi.fn();
      const { start } = useAutoRefresh(cb);

      start();
      vi.advanceTimersByTime(14999);
      expect(cb).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });
});
