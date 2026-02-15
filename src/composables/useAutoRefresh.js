import { onBeforeUnmount, ref } from "vue";
import { getNetworkRefreshIntervalMs } from "@/utils/env";

/**
 * Composable for auto-refreshing data at network-specific intervals.
 * Handles cleanup on unmount and pauses when the browser tab is hidden.
 *
 * @param {Function} callback - Async or sync function to call on each tick
 * @param {Object} [options]
 * @param {number|null} [options.intervalMs=null] - Custom interval; null uses network default
 * @param {boolean} [options.pauseWhenHidden=true] - Pause refresh when tab is not visible
 * @param {boolean} [options.immediate=false] - Start refreshing immediately on creation
 */
export function useAutoRefresh(callback, options = {}) {
  const { intervalMs = null, pauseWhenHidden = true, immediate = false } = options;

  const isActive = ref(false);
  const isIntentionallyActive = ref(false);
  let timerId = null;

  function getInterval() {
    return intervalMs ?? getNetworkRefreshIntervalMs();
  }

  function start() {
    stop();
    isIntentionallyActive.value = true;
    timerId = setInterval(callback, getInterval());
    isActive.value = true;
  }

  function stop() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    isActive.value = false;
    isIntentionallyActive.value = false;
  }

  // Pause when the tab is hidden to avoid wasted network requests
  if (pauseWhenHidden && typeof document !== "undefined") {
    const onVisibilityChange = () => {
      if (document.hidden) {
        if (timerId !== null) {
          clearInterval(timerId);
          timerId = null;
        }
        isActive.value = false;
      } else if (isIntentionallyActive.value && !timerId) {
        timerId = setInterval(callback, getInterval());
        isActive.value = true;
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    onBeforeUnmount(() => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    });
  }

  onBeforeUnmount(stop);

  if (immediate) {
    start();
  }

  return { isActive, start, stop };
}
