import { onBeforeUnmount, ref, onActivated, onDeactivated } from "vue";
import { getNetworkRefreshIntervalMs, NETWORK_CHANGE_EVENT } from "@/utils/env";

/**
 * Composable for auto-refreshing data at network-specific intervals.
 * Handles cleanup on unmount and pauses when the browser tab is hidden or component is deactivated via keep-alive.
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

  function _startTimer() {
    if (timerId !== null) return;
    timerId = setInterval(callback, getInterval());
    isActive.value = true;
  }

  function _stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    isActive.value = false;
  }

  function start() {
    _stopTimer();
    isIntentionallyActive.value = true;
    _startTimer();
  }

  function stop() {
    _stopTimer();
    isIntentionallyActive.value = false;
  }

  // Pause when the tab is hidden to avoid wasted network requests
  if (pauseWhenHidden && typeof document !== "undefined") {
    const onVisibilityChange = () => {
      if (document.hidden) {
        _stopTimer();
      } else if (isIntentionallyActive.value) {
        _startTimer();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    onBeforeUnmount(() => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    });
  }

  onDeactivated(() => {
    _stopTimer();
  });

  onActivated(() => {
    if (isIntentionallyActive.value) {
      _startTimer();
      callback(); // trigger immediate refresh on return
    }
  });

  if (typeof window !== "undefined") {
    const onNetworkChange = () => {
      if (!isIntentionallyActive.value) return;
      _stopTimer();
      _startTimer();
      callback();
    };

    window.addEventListener(NETWORK_CHANGE_EVENT, onNetworkChange);
    onBeforeUnmount(() => {
      window.removeEventListener(NETWORK_CHANGE_EVENT, onNetworkChange);
    });
  }

  onBeforeUnmount(stop);

  if (immediate) {
    start();
  }

  return { isActive, start, stop };
}
