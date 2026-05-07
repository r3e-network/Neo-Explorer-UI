import { onUnmounted, getCurrentInstance } from "vue";

export function useDebounceFn(fn, delay = 300) {
  let timeoutId = null;

  const debouncedFn = (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const flush = (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    fn(...args);
  };

  if (getCurrentInstance()) {
    onUnmounted(cancel);
  }

  return { debouncedFn, cancel, flush };
}
