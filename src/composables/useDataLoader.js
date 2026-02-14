import { ref, shallowRef, watch, onBeforeUnmount } from "vue";

/**
 * Composable for reactive data loading with watch-based auto-reload,
 * AbortController support, and optional polling.
 *
 * Extends the useAsync pattern used across detail views to eliminate
 * the manual watch + ref + AbortController boilerplate.
 *
 * @param {(signal: AbortSignal) => Promise<*>} fetchFn
 *   Async function that receives an AbortSignal and returns data.
 * @param {import('vue').Ref | import('vue').ComputedRef | (() => *)} source
 *   Reactive source to watch. When it changes, fetchFn is re-invoked.
 * @param {Object} [options]
 * @param {boolean} [options.immediate=true] - Load immediately on creation
 * @param {*} [options.initialData=null] - Initial data value
 * @param {number} [options.pollInterval=0] - Polling interval in ms (0 = disabled)
 * @param {Function} [options.onSuccess] - Callback on success
 * @param {Function} [options.onError] - Callback on error
 * @returns {{ data: import('vue').Ref, loading: import('vue').Ref<boolean>, error: import('vue').Ref, reload: Function, stop: Function }}
 */
export function useDataLoader(fetchFn, source, options = {}) {
  const { immediate = true, initialData = null, pollInterval = 0, onSuccess, onError } = options;

  const data = shallowRef(initialData);
  const loading = ref(false);
  const error = ref(null);

  let abortController = null;
  let pollTimer = null;

  async function load() {
    abortController?.abort();
    abortController = new AbortController();
    const signal = abortController.signal;

    loading.value = true;
    error.value = null;

    try {
      const result = await fetchFn(signal);
      if (signal.aborted) return;
      data.value = result;
      if (typeof onSuccess === "function") onSuccess(result);
    } catch (err) {
      if (signal.aborted) return;
      error.value = err;
      if (typeof onError === "function") onError(err);
      if (import.meta.env.DEV) {
        console.warn("[useDataLoader] fetch failed:", err);
      }
    } finally {
      if (!signal.aborted) loading.value = false;
    }
  }

  function stop() {
    abortController?.abort();
    abortController = null;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    if (pollInterval > 0) {
      pollTimer = setInterval(load, pollInterval);
    }
  }

  // Watch source for changes — re-load and restart polling
  const stopWatch = watch(
    source,
    (val) => {
      if (val === null || val === undefined || val === "") return;
      load();
      startPolling();
    },
    { immediate }
  );

  onBeforeUnmount(() => {
    stop();
    stopWatch();
  });

  return { data, loading, error, reload: load, stop };
}
