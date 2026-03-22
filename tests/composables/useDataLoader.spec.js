import { useDataLoader } from "@/composables/useDataLoader";
import { ref, nextTick } from "vue";

// Mock onBeforeUnmount since we're not in a component lifecycle
vi.mock("vue", async () => {
  const actual = await vi.importActual("vue");
  return {
    ...actual,
    onBeforeUnmount: vi.fn(),
  };
});

// Flush both microtasks and macrotasks without fake timer interference
function flushPromises() {
  return new Promise((r) => {
    // Use queueMicrotask to avoid setTimeout being intercepted by fake timers
    queueMicrotask(() => queueMicrotask(r));
  });
}

async function flush() {
  await nextTick();
  await flushPromises();
  await nextTick();
}

describe("useDataLoader", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("returns correct default initial state", () => {
      const source = ref("test");
      const fetchFn = vi.fn().mockResolvedValue("data");
      const { data, loading, error } = useDataLoader(fetchFn, source, { immediate: false });

      expect(data.value).toBeNull();
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
    });

    it("uses provided initialData", () => {
      const source = ref("test");
      const fetchFn = vi.fn().mockResolvedValue("data");
      const { data } = useDataLoader(fetchFn, source, { immediate: false, initialData: "init" });

      expect(data.value).toBe("init");
    });
  });

  describe("immediate loading", () => {
    it("loads immediately when immediate=true (default)", async () => {
      const source = ref("abc");
      const fetchFn = vi.fn().mockResolvedValue("loaded");
      const { data } = useDataLoader(fetchFn, source);

      await flush();
      expect(fetchFn).toHaveBeenCalledOnce();
      expect(data.value).toBe("loaded");
    });

    it("does not load when immediate=false", async () => {
      const source = ref("abc");
      const fetchFn = vi.fn().mockResolvedValue("loaded");
      useDataLoader(fetchFn, source, { immediate: false });

      await flush();
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("skips load when source is null", async () => {
      const source = ref(null);
      const fetchFn = vi.fn().mockResolvedValue("data");
      useDataLoader(fetchFn, source);

      await flush();
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("skips load when source is empty string", async () => {
      const source = ref("");
      const fetchFn = vi.fn().mockResolvedValue("data");
      useDataLoader(fetchFn, source);

      await flush();
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("skips load when source is undefined", async () => {
      const source = ref(undefined);
      const fetchFn = vi.fn().mockResolvedValue("data");
      useDataLoader(fetchFn, source);

      await flush();
      expect(fetchFn).not.toHaveBeenCalled();
    });
  });

  describe("watch-based reload", () => {
    it("reloads when source changes", async () => {
      const source = ref("first");
      const fetchFn = vi.fn().mockResolvedValue("data");
      useDataLoader(fetchFn, source);

      await flush();
      expect(fetchFn).toHaveBeenCalledTimes(1);

      source.value = "second";
      await flush();
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it("does not reload when source changes to null", async () => {
      const source = ref("valid");
      const fetchFn = vi.fn().mockResolvedValue("data");
      useDataLoader(fetchFn, source);

      await flush();
      expect(fetchFn).toHaveBeenCalledTimes(1);

      source.value = null;
      await flush();
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("abort behavior", () => {
    it("passes AbortSignal to fetchFn", async () => {
      const source = ref("test");
      const fetchFn = vi.fn().mockResolvedValue("data");
      useDataLoader(fetchFn, source);

      await flush();
      expect(fetchFn).toHaveBeenCalledWith(expect.any(AbortSignal));
    });

    it("aborts previous request on reload", async () => {
      const signals = [];
      const source = ref("a");
      const fetchFn = vi.fn((signal) => {
        signals.push(signal);
        return Promise.resolve("data");
      });

      useDataLoader(fetchFn, source);
      await flush();

      source.value = "b";
      await flush();

      expect(signals.length).toBe(2);
      expect(signals[0].aborted).toBe(true);
    });
  });

  describe("error handling", () => {
    it("sets error on fetch failure", async () => {
      const source = ref("test");
      const err = new Error("network");
      const fetchFn = vi.fn().mockRejectedValue(err);

      vi.spyOn(console, "warn").mockImplementation(() => {});
      const { error, loading } = useDataLoader(fetchFn, source);

      await flush();
      expect(error.value).toBe(err);
      expect(loading.value).toBe(false);
    });

    it("calls onError callback on failure", async () => {
      const source = ref("test");
      const err = new Error("fail");
      const fetchFn = vi.fn().mockRejectedValue(err);
      const onError = vi.fn();

      vi.spyOn(console, "warn").mockImplementation(() => {});
      useDataLoader(fetchFn, source, { onError });

      await flush();
      expect(onError).toHaveBeenCalledWith(err);
    });
  });

  describe("callbacks", () => {
    it("calls onSuccess with result", async () => {
      const source = ref("test");
      const onSuccess = vi.fn();
      const fetchFn = vi.fn().mockResolvedValue("payload");
      useDataLoader(fetchFn, source, { onSuccess });

      await flush();
      expect(onSuccess).toHaveBeenCalledWith("payload");
    });
  });

  describe("stop()", () => {
    it("aborts current request", async () => {
      const signals = [];
      const source = ref("test");
      const fetchFn = vi.fn((signal) => {
        signals.push(signal);
        return Promise.resolve("data");
      });

      const { stop } = useDataLoader(fetchFn, source);
      await flush();

      stop();
      expect(signals[0].aborted).toBe(true);
    });

    it("clears polling interval", async () => {
      vi.useFakeTimers();
      const source = ref("test");
      const fetchFn = vi.fn().mockResolvedValue("data");
      const { stop } = useDataLoader(fetchFn, source, { pollInterval: 5000 });

      // Flush the immediate watch trigger
      await vi.advanceTimersByTimeAsync(0);

      fetchFn.mockClear();
      stop();

      await vi.advanceTimersByTimeAsync(15000);
      expect(fetchFn).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe("polling", () => {
    it("polls at specified interval", async () => {
      vi.useFakeTimers();
      const source = ref("test");
      const fetchFn = vi.fn().mockResolvedValue("data");
      useDataLoader(fetchFn, source, { pollInterval: 1000 });

      // Flush the immediate watch trigger
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1000);
      expect(fetchFn).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(1000);
      expect(fetchFn).toHaveBeenCalledTimes(3);
      vi.useRealTimers();
    });

    it("does not poll when pollInterval is 0", async () => {
      vi.useFakeTimers();
      const source = ref("test");
      const fetchFn = vi.fn().mockResolvedValue("data");
      useDataLoader(fetchFn, source, { pollInterval: 0 });

      await vi.advanceTimersByTimeAsync(0);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(5000);
      expect(fetchFn).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });

  describe("reload()", () => {
    it("manually triggers a reload", async () => {
      const source = ref("test");
      const fetchFn = vi.fn().mockResolvedValue("data");
      const { reload } = useDataLoader(fetchFn, source);

      await flush();
      expect(fetchFn).toHaveBeenCalledTimes(1);

      await reload();
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });
});
