import { getCurrentInstance, onBeforeUnmount, ref, onActivated, onDeactivated } from "vue";
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

  const hasComponentInstance = Boolean(getCurrentInstance());
  const isActive = ref(false);
  const isIntentionallyActive = ref(false);
  let timerId = null;
  let callbackInFlight = false;

  function getInterval() {
    return intervalMs ?? getNetworkRefreshIntervalMs();
  }

  async function _runCallback() {
    if (callbackInFlight) return;
    callbackInFlight = true;
    try {
      await callback();
    } finally {
      callbackInFlight = false;
    }
  }

  function _scheduleNextTick() {
    if (timerId !== null) return;
    timerId = setTimeout(async () => {
      timerId = null;
      try {
        await _runCallback();
      } catch {
        // Callback error should not kill the refresh loop
      }
      if (isIntentionallyActive.value && (!pauseWhenHidden || !document.hidden)) {
        _scheduleNextTick();
      }
    }, getInterval());
    isActive.value = true;
  }

  function _stopTimer() {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    isActive.value = false;
  }

  function start() {
    _stopTimer();
    isIntentionallyActive.value = true;
    _scheduleNextTick();
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
        _scheduleNextTick();
        void _runCallback();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    if (hasComponentInstance) onBeforeUnmount(() => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    });
  }

  if (hasComponentInstance) onDeactivated(() => {
    _stopTimer();
  });

  if (hasComponentInstance) onActivated(() => {
    if (isIntentionallyActive.value) {
      _scheduleNextTick();
      void _runCallback(); // trigger immediate refresh on return
    }
  });

  if (typeof window !== "undefined") {
    const onNetworkChange = () => {
      if (!isIntentionallyActive.value) return;
      _stopTimer();
      _scheduleNextTick();
      void _runCallback();
    };

    window.addEventListener(NETWORK_CHANGE_EVENT, onNetworkChange);
    if (hasComponentInstance) onBeforeUnmount(() => {
      window.removeEventListener(NETWORK_CHANGE_EVENT, onNetworkChange);
    });
  }

  if (hasComponentInstance) onBeforeUnmount(stop);

  if (immediate) {
    start();
  }

  return { isActive, start, stop };
}
