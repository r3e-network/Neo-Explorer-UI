import { ref, shallowRef, getCurrentInstance, onBeforeUnmount } from "vue";

/**
 * Composable for standardized async operation handling.
 *
 * Supports AbortController: each `execute()` call creates a new controller and
 * aborts the previous in-flight request. The signal is passed as the last
 * argument to `asyncFn`, so callers can forward it to fetch / RPC calls.
 *
 * @param {Function} asyncFn - The async function to wrap. Receives (...args, { signal }).
 * @param {Object} options - Configuration options
 * @param {boolean} [options.immediate=false] - Execute immediately on creation
 * @param {*} [options.initialData=null] - Initial data value
 * @param {Function} [options.onSuccess] - Callback on success
 * @param {Function} [options.onError] - Callback on error
 * @returns {{ data: import('vue').Ref, loading: import('vue').Ref<boolean>, error: import('vue').Ref, execute: Function, reset: Function, abort: Function }}
 */
export function useAsync(asyncFn, options = {}) {
  const { immediate = false, initialData = null, onSuccess, onError } = options;

  const data = shallowRef(initialData);
  const loading = ref(false);
  const error = ref(null);

  let requestId = 0;
  let controller = null;

  async function execute(...args) {
    // Abort previous in-flight request
    controller?.abort();
    controller = new AbortController();

    const myId = ++requestId;
    const { signal } = controller;

    loading.value = true;
    error.value = null;
    try {
      const result = await asyncFn(...args, { signal });
      if (myId !== requestId) return undefined;
      data.value = result;
      if (typeof onSuccess === "function") onSuccess(result);
      return result;
    } catch (err) {
      if (myId !== requestId) return undefined;
      // Swallow AbortError — it's intentional cancellation, not a failure
      if (err?.name === "AbortError") return undefined;
      error.value = err;
      if (typeof onError === "function") onError(err);
      return undefined;
    } finally {
      if (myId === requestId) {
        loading.value = false;
      }
    }
  }

  function abort() {
    controller?.abort();
    controller = null;
    loading.value = false;
  }

  function reset() {
    abort();
    data.value = initialData;
    error.value = null;
  }

  // Auto-cleanup: abort in-flight request when the host component unmounts
  if (getCurrentInstance()) {
    onBeforeUnmount(() => abort());
  }

  if (immediate) {
    execute();
  }

  return { data, loading, error, execute, reset, abort };
}
