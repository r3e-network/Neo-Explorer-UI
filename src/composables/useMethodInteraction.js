import { ref, watch } from "vue";
import {
  explainTransactionError,
  explainTransactionSimulation,
  isSimulationFault,
} from "@/utils/transactionSimulation";

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
        gasEstimate: null,
        simulation: null,
        estimating: false,
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

  async function invokeMethod(idx, method, options) {
    const state = methodState.value[idx];
    if (!state) return;
    const capturedGen = generation;
    state.loading = true;
    state.error = "";
    state.result = undefined;
    state.simulation = null;
    try {
      const params = (method.parameters || []).map((p, i) => ({
        type: p.type,
        value: state.params[i] || "",
      }));
      const result = await invokeFn(method.name, params, options);
      if (capturedGen !== generation) return;
      state.result = result;
    } catch (err) {
      if (capturedGen !== generation) return;
      state.error = err?.message || errorFallback;
      state.simulation = err?.simulationExplanation || explainTransactionError(err, { operation: method?.name });
    } finally {
      if (capturedGen === generation) {
        state.loading = false;
      }
    }
  }

  async function estimateGas(idx, method, testInvokeFn) {
    const state = methodState.value[idx];
    if (!state || !testInvokeFn) return;
    state.estimating = true;
    state.error = "";
    state.gasEstimate = null;
    state.simulation = null;
    try {
      const params = (method.parameters || []).map((p, i) => ({
        type: p.type,
        value: state.params[i] || "",
      }));
      const result = await testInvokeFn(method.name, params);
      state.simulation = explainTransactionSimulation(result, { operation: method?.name });
      if (isSimulationFault(result)) {
        state.gasEstimate = null;
        state.error = state.simulation.summary;
        return;
      }
      state.gasEstimate = result?.gasconsumed || result?.gas_consumed || result?.gasConsumed || null;
    } catch (err) {
      state.gasEstimate = null;
      state.simulation = explainTransactionError(err, { operation: method?.name });
    } finally {
      state.estimating = false;
    }
  }

  return {
    methodState,
    toggleMethod,
    updateParam,
    invokeMethod,
    estimateGas,
  };
}
