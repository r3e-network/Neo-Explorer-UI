import { ref, watch } from "vue";

/**
 * Composable that encapsulates the shared interaction pattern for
 * contract read/write method panels (toggle, param update, invoke, state reset).
 *
 * @param {import('vue').ComputedRef<Array>} methods - computed list of ABI methods
 * @param {(hash: string, name: string, params: Array) => Promise<any>} invokeFn
 *   Async function that performs the actual invocation and returns a result.
 * @param {Object} [options]
 * @param {string} [options.errorFallback] - Fallback error message when invocation throws without a message.
 */
export function useMethodInteraction(methods, invokeFn, options = {}) {
  const { errorFallback = "Invocation failed." } = options;

  const methodState = ref([]);
  let generation = 0;

  // Rebuild state array whenever the method list changes
  watch(
    methods,
    (list) => {
      generation++;
      methodState.value = (list || []).map(() => ({
        open: false,
        params: [],
        loading: false,
        result: undefined,
        error: "",
      }));
    },
    { immediate: true }
  );

  function toggleMethod(idx) {
    if (!methodState.value[idx]) return;
    methodState.value[idx].open = !methodState.value[idx].open;
  }

  function updateParam(methodIdx, paramIdx, value) {
    if (methodState.value[methodIdx]) {
      methodState.value[methodIdx].params[paramIdx] = value;
    }
  }

  async function invokeMethod(idx, method) {
    const state = methodState.value[idx];
    if (!state) return;
    const capturedGen = generation;
    state.loading = true;
    state.error = "";
    state.result = undefined;
    try {
      const params = (method.parameters || []).map((p, i) => ({
        type: p.type,
        value: state.params[i] || "",
      }));
      const result = await invokeFn(method.name, params);
      if (capturedGen !== generation) return; // stale — methods list changed
      state.result = result;
    } catch (err) {
      if (capturedGen !== generation) return;
      state.error = err?.message || errorFallback;
    } finally {
      if (capturedGen === generation) {
        state.loading = false;
      }
    }
  }

  return {
    methodState,
    toggleMethod,
    updateParam,
    invokeMethod,
  };
}
