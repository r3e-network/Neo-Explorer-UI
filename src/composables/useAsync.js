import { ref, shallowRef } from "vue";

/**
 * Composable for standardized async operation handling.
 * @param {Function} asyncFn - The async function to wrap
 * @param {Object} options - Configuration options
 * @param {boolean} [options.immediate=false] - Execute immediately on creation
 * @param {*} [options.initialData=null] - Initial data value
 * @param {Function} [options.onSuccess] - Callback on success
 * @param {Function} [options.onError] - Callback on error
 * @returns {{ data: import('vue').Ref, loading: import('vue').Ref<boolean>, error: import('vue').Ref, execute: Function, reset: Function }}
 */
export function useAsync(asyncFn, options = {}) {
  const { immediate = false, initialData = null, onSuccess, onError } = options;

  const data = shallowRef(initialData);
  const loading = ref(false);
  const error = ref(null);

  async function execute(...args) {
    loading.value = true;
    error.value = null;
    try {
      const result = await asyncFn(...args);
      data.value = result;
      if (typeof onSuccess === "function") onSuccess(result);
      return result;
    } catch (err) {
      error.value = err;
      if (typeof onError === "function") onError(err);
      return undefined;
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    data.value = initialData;
    error.value = null;
    loading.value = false;
  }

  if (immediate) {
    execute();
  }

  return { data, loading, error, execute, reset };
}
