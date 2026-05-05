import { useMethodInteraction } from "@/composables/useMethodInteraction";
import { ref, computed, nextTick } from "vue";

function makeMethods(list) {
  const source = ref(list);
  const computedList = computed(() => source.value);
  return { source, computedList };
}

describe("useMethodInteraction", () => {
  it("initializes methodState with one entry per method, all collapsed by default", async () => {
    const { computedList } = makeMethods([
      { name: "balanceOf", parameters: [{ type: "Hash160" }] },
      { name: "transfer", parameters: [{ type: "Hash160" }, { type: "Integer" }] },
    ]);
    const { methodState } = useMethodInteraction(computedList, vi.fn());
    await nextTick();
    expect(methodState.value).toHaveLength(2);
    expect(methodState.value[0].open).toBe(false);
    expect(methodState.value[0].loading).toBe(false);
    expect(methodState.value[0].error).toBe("");
    expect(methodState.value[0].params).toEqual([]);
  });

  it("rebuilds methodState when the methods source changes", async () => {
    const { source, computedList } = makeMethods([{ name: "a", parameters: [] }]);
    const { methodState } = useMethodInteraction(computedList, vi.fn());
    await nextTick();
    expect(methodState.value).toHaveLength(1);
    source.value = [{ name: "x", parameters: [] }, { name: "y", parameters: [] }];
    await nextTick();
    expect(methodState.value).toHaveLength(2);
  });

  it("toggleMethod flips the open flag", async () => {
    const { computedList } = makeMethods([{ name: "a", parameters: [] }]);
    const { methodState, toggleMethod } = useMethodInteraction(computedList, vi.fn());
    await nextTick();
    expect(methodState.value[0].open).toBe(false);
    toggleMethod(0);
    expect(methodState.value[0].open).toBe(true);
    toggleMethod(0);
    expect(methodState.value[0].open).toBe(false);
  });

  it("toggleMethod is a no-op for invalid index", async () => {
    const { computedList } = makeMethods([{ name: "a", parameters: [] }]);
    const { toggleMethod } = useMethodInteraction(computedList, vi.fn());
    await nextTick();
    expect(() => toggleMethod(5)).not.toThrow();
  });

  it("updateParam stores values by method+param index", async () => {
    const { computedList } = makeMethods([
      { name: "transfer", parameters: [{ type: "Hash160" }, { type: "Integer" }] },
    ]);
    const { methodState, updateParam } = useMethodInteraction(computedList, vi.fn());
    await nextTick();
    updateParam(0, 0, "Naddr1");
    updateParam(0, 1, "100");
    expect(methodState.value[0].params[0]).toBe("Naddr1");
    expect(methodState.value[0].params[1]).toBe("100");
  });

  it("invokeMethod sets loading true, then stores result on success", async () => {
    const invokeFn = vi.fn().mockResolvedValue({ value: 42 });
    const { computedList } = makeMethods([{ name: "balanceOf", parameters: [{ type: "Hash160" }] }]);
    const { methodState, updateParam, invokeMethod } = useMethodInteraction(computedList, invokeFn);
    await nextTick();
    updateParam(0, 0, "Naddr1");
    const promise = invokeMethod(0, { name: "balanceOf", parameters: [{ type: "Hash160" }] }, {});
    expect(methodState.value[0].loading).toBe(true);
    await promise;
    expect(invokeFn).toHaveBeenCalledWith("balanceOf", [{ type: "Hash160", value: "Naddr1" }], {});
    expect(methodState.value[0].result).toEqual({ value: 42 });
    expect(methodState.value[0].loading).toBe(false);
    expect(methodState.value[0].error).toBe("");
  });

  it("invokeMethod stores error.message on failure and clears loading", async () => {
    const invokeFn = vi.fn().mockRejectedValue(new Error("rpc unreachable"));
    const { computedList } = makeMethods([{ name: "x", parameters: [] }]);
    const { methodState, invokeMethod } = useMethodInteraction(computedList, invokeFn);
    await nextTick();
    await invokeMethod(0, { name: "x", parameters: [] }, {});
    expect(methodState.value[0].error).toBe("rpc unreachable");
    expect(methodState.value[0].loading).toBe(false);
    expect(methodState.value[0].result).toBeUndefined();
  });

  it("invokeMethod uses errorFallback when error has no message", async () => {
    const invokeFn = vi.fn().mockRejectedValue({});
    const { computedList } = makeMethods([{ name: "x", parameters: [] }]);
    const { methodState, invokeMethod } = useMethodInteraction(computedList, invokeFn, {
      errorFallback: "custom fallback",
    });
    await nextTick();
    await invokeMethod(0, { name: "x", parameters: [] }, {});
    expect(methodState.value[0].error).toBe("custom fallback");
  });

  it("invokeMethod ignores stale result when methods change mid-flight (generation guard)", async () => {
    let resolve;
    const invokeFn = vi.fn(() => new Promise((r) => { resolve = r; }));
    const { source, computedList } = makeMethods([{ name: "x", parameters: [] }]);
    const { methodState, invokeMethod } = useMethodInteraction(computedList, invokeFn);
    await nextTick();
    const promise = invokeMethod(0, { name: "x", parameters: [] }, {});
    // Methods change while invocation is in flight — generation bumps
    source.value = [{ name: "y", parameters: [] }];
    await nextTick();
    resolve({ stale: true });
    await promise;
    // After rebuild, the new state[0] should still be in initial state
    expect(methodState.value[0].result).toBeUndefined();
    expect(methodState.value[0].loading).toBe(false);
  });

  it("estimateGas stores gasconsumed from successful test-invoke", async () => {
    const testInvokeFn = vi.fn().mockResolvedValue({ gasconsumed: "12345" });
    const { computedList } = makeMethods([{ name: "x", parameters: [] }]);
    const { methodState, estimateGas } = useMethodInteraction(computedList, vi.fn());
    await nextTick();
    await estimateGas(0, { name: "x", parameters: [] }, testInvokeFn);
    expect(methodState.value[0].gasEstimate).toBe("12345");
    expect(methodState.value[0].estimating).toBe(false);
  });

  it("estimateGas falls back to gas_consumed key when gasconsumed is absent", async () => {
    const testInvokeFn = vi.fn().mockResolvedValue({ gas_consumed: "5000" });
    const { computedList } = makeMethods([{ name: "x", parameters: [] }]);
    const { methodState, estimateGas } = useMethodInteraction(computedList, vi.fn());
    await nextTick();
    await estimateGas(0, { name: "x", parameters: [] }, testInvokeFn);
    expect(methodState.value[0].gasEstimate).toBe("5000");
  });

  it("estimateGas sets gasEstimate to null on test-invoke failure", async () => {
    const testInvokeFn = vi.fn().mockRejectedValue(new Error("test failed"));
    const { computedList } = makeMethods([{ name: "x", parameters: [] }]);
    const { methodState, estimateGas } = useMethodInteraction(computedList, vi.fn());
    await nextTick();
    await estimateGas(0, { name: "x", parameters: [] }, testInvokeFn);
    expect(methodState.value[0].gasEstimate).toBeNull();
    expect(methodState.value[0].estimating).toBe(false);
  });

  it("estimateGas is a no-op when no testInvokeFn provided", async () => {
    const { computedList } = makeMethods([{ name: "x", parameters: [] }]);
    const { methodState, estimateGas } = useMethodInteraction(computedList, vi.fn());
    await nextTick();
    await estimateGas(0, { name: "x", parameters: [] }, null);
    expect(methodState.value[0].estimating).toBe(false);
    expect(methodState.value[0].gasEstimate).toBeNull();
  });
});
