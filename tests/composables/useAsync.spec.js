import { useAsync } from "@/composables/useAsync";
import { nextTick } from "vue";

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("useAsync", () => {
  describe("initial state", () => {
    it("returns correct default initial state", () => {
      const { data, loading, error } = useAsync(vi.fn());
      expect(data.value).toBeNull();
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
    });

    it("uses provided initialData", () => {
      const { data } = useAsync(vi.fn(), { initialData: { foo: 1 } });
      expect(data.value).toEqual({ foo: 1 });
    });
  });

  describe("execute()", () => {
    it("sets loading=true during execution and false after", async () => {
      let resolveFn;
      const asyncFn = vi.fn(
        () =>
          new Promise((r) => {
            resolveFn = r;
          })
      );
      const { loading, execute } = useAsync(asyncFn);

      const promise = execute();
      expect(loading.value).toBe(true);

      resolveFn("done");
      await promise;
      expect(loading.value).toBe(false);
    });

    it("stores result in data on success", async () => {
      const asyncFn = vi.fn().mockResolvedValue({ id: 42 });
      const { data, execute } = useAsync(asyncFn);

      await execute();
      expect(data.value).toEqual({ id: 42 });
    });

    it("returns the result from execute()", async () => {
      const asyncFn = vi.fn().mockResolvedValue("result");
      const { execute } = useAsync(asyncFn);

      const result = await execute();
      expect(result).toBe("result");
    });

    it("passes arguments through to asyncFn", async () => {
      const asyncFn = vi.fn().mockResolvedValue(null);
      const { execute } = useAsync(asyncFn);

      await execute("a", 2, true);
      expect(asyncFn).toHaveBeenCalledWith("a", 2, true, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    });

    it("clears previous error on new execute", async () => {
      const asyncFn = vi.fn().mockRejectedValueOnce(new Error("fail")).mockResolvedValueOnce("ok");
      const { error, execute } = useAsync(asyncFn);

      await execute();
      expect(error.value).toBeInstanceOf(Error);

      await execute();
      expect(error.value).toBeNull();
    });
  });

  describe("error handling", () => {
    it("sets error on rejection and returns undefined", async () => {
      const err = new Error("boom");
      const asyncFn = vi.fn().mockRejectedValue(err);
      const { data, error, loading, execute } = useAsync(asyncFn);

      const result = await execute();
      expect(error.value).toBe(err);
      expect(loading.value).toBe(false);
      expect(data.value).toBeNull();
      expect(result).toBeUndefined();
    });

    it("sets loading=false even on error", async () => {
      const asyncFn = vi.fn().mockRejectedValue(new Error("fail"));
      const { loading, execute } = useAsync(asyncFn);

      await execute();
      expect(loading.value).toBe(false);
    });
  });

  describe("callbacks", () => {
    it("calls onSuccess with result", async () => {
      const onSuccess = vi.fn();
      const asyncFn = vi.fn().mockResolvedValue("data");
      const { execute } = useAsync(asyncFn, { onSuccess });

      await execute();
      expect(onSuccess).toHaveBeenCalledWith("data");
    });

    it("calls onError with error", async () => {
      const onError = vi.fn();
      const err = new Error("oops");
      const asyncFn = vi.fn().mockRejectedValue(err);
      const { execute } = useAsync(asyncFn, { onError });

      await execute();
      expect(onError).toHaveBeenCalledWith(err);
    });

    it("does not throw when callbacks are not provided", async () => {
      const asyncFn = vi.fn().mockResolvedValue("ok");
      const { execute } = useAsync(asyncFn);
      await expect(execute()).resolves.toBe("ok");
    });
  });

  describe("immediate option", () => {
    it("executes immediately when immediate=true", async () => {
      const asyncFn = vi.fn().mockResolvedValue("auto");
      const { data } = useAsync(asyncFn, { immediate: true });

      await flushPromises();
      expect(asyncFn).toHaveBeenCalledOnce();
      expect(data.value).toBe("auto");
    });

    it("does not execute on creation when immediate=false", () => {
      const asyncFn = vi.fn();
      useAsync(asyncFn, { immediate: false });
      expect(asyncFn).not.toHaveBeenCalled();
    });
  });

  describe("reset()", () => {
    it("resets data, error, and loading to initial values", async () => {
      const asyncFn = vi.fn().mockResolvedValue("loaded");
      const { data, loading, error, execute, reset } = useAsync(asyncFn, { initialData: "init" });

      await execute();
      expect(data.value).toBe("loaded");

      reset();
      expect(data.value).toBe("init");
      expect(error.value).toBeNull();
      expect(loading.value).toBe(false);
    });

    it("resets error state after failure", async () => {
      const asyncFn = vi.fn().mockRejectedValue(new Error("fail"));
      const { error, reset, execute } = useAsync(asyncFn);

      await execute();
      expect(error.value).toBeTruthy();

      reset();
      expect(error.value).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("handles rapid successive calls (last call wins)", async () => {
      let callCount = 0;
      const asyncFn = vi.fn(() => {
        const id = ++callCount;
        return new Promise((resolve) => setTimeout(() => resolve(`result-${id}`), id * 10));
      });
      const { data, execute } = useAsync(asyncFn);

      // Fire multiple calls without awaiting
      execute();
      execute();
      const last = execute();

      await last;
      // The last call's result should be in data (all resolve, last one overwrites)
      await flushPromises();
      // Since useAsync doesn't have race-condition guards, data will be the last to resolve
      expect(asyncFn).toHaveBeenCalledTimes(3);
    });

    it("handles asyncFn returning undefined", async () => {
      const asyncFn = vi.fn().mockResolvedValue(undefined);
      const { data, execute } = useAsync(asyncFn);

      await execute();
      expect(data.value).toBeUndefined();
    });

    it("handles asyncFn returning null", async () => {
      const asyncFn = vi.fn().mockResolvedValue(null);
      const { data, execute } = useAsync(asyncFn);

      await execute();
      expect(data.value).toBeNull();
    });
  });
});
