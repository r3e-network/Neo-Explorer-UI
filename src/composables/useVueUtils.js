import { ref, onMounted, onUnmounted } from "vue";

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

  return { debouncedFn, cancel, flush };
}

export function useThrottleFn(fn, delay = 300) {
  let lastCall = 0;
  let timeoutId = null;

  const throttledFn = (...args) => {
    const now = Date.now();
    const remaining = delay - (now - lastCall);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, remaining);
    }
  };

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  onUnmounted(() => {
    cancel();
  });

  return { throttledFn, cancel };
}

export function useDebouncedRef(source, delay = 300) {
  const debouncedValue = ref(source.value);
  let timeoutId = null;

  const update = (newValue) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      debouncedValue.value = newValue;
    }, delay);
  };

  onUnmounted(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });

  return {
    value: debouncedValue,
    update,
  };
}

export function useClickOutside(targetRef, callback) {
  const handleClick = (event) => {
    const target = targetRef.value;
    if (target && !target.contains(event.target)) {
      callback(event);
    }
  };

  onMounted(() => {
    document.addEventListener("click", handleClick, true);
  });

  onUnmounted(() => {
    document.removeEventListener("click", handleClick, true);
  });
}

export function useKeyPress(key, callback, options = {}) {
  const { target = document, once = false } = options;

  const handler = (event) => {
    if (event.key === key || event.code === key) {
      callback(event);
      if (once) {
        target.removeEventListener("keydown", handler);
      }
    }
  };

  onMounted(() => {
    target.addEventListener("keydown", handler);
  });

  onUnmounted(() => {
    target.removeEventListener("keydown", handler);
  });
}

export function useLocalStorage(key, defaultValue) {
  const data = ref(defaultValue);

  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      data.value = JSON.parse(stored);
    } catch (e) {
      data.value = stored;
    }
  }

  const setValue = (value) => {
    data.value = value;
    const toStore = typeof value === "string" ? value : JSON.stringify(value);
    localStorage.setItem(key, toStore);
  };

  const removeValue = () => {
    data.value = defaultValue;
    localStorage.removeItem(key);
  };

  return { data, setValue, removeValue };
}

export function useSessionStorage(key, defaultValue) {
  const data = ref(defaultValue);

  const stored = sessionStorage.getItem(key);
  if (stored) {
    try {
      data.value = JSON.parse(stored);
    } catch (e) {
      data.value = stored;
    }
  }

  const setValue = (value) => {
    data.value = value;
    const toStore = typeof value === "string" ? value : JSON.stringify(value);
    sessionStorage.setItem(key, toStore);
  };

  const removeValue = () => {
    data.value = defaultValue;
    sessionStorage.removeItem(key);
  };

  return { data, setValue, removeValue };
}

export function useWindowSize() {
  const width = ref(window.innerWidth);
  const height = ref(window.innerHeight);

  const handleResize = () => {
    width.value = window.innerWidth;
    height.value = window.innerHeight;
  };

  onMounted(() => {
    window.addEventListener("resize", handleResize, { passive: true });
  });

  onUnmounted(() => {
    window.removeEventListener("resize", handleResize);
  });

  return { width, height };
}

export function useMediaQuery(query) {
  const matches = ref(false);
  let mediaQuery = null;

  const handleChange = (event) => {
    matches.value = event.matches;
  };

  onMounted(() => {
    mediaQuery = window.matchMedia(query);
    matches.value = mediaQuery.matches;
    mediaQuery.addEventListener("change", handleChange);
  });

  onUnmounted(() => {
    if (mediaQuery) {
      mediaQuery.removeEventListener("change", handleChange);
    }
  });

  return matches;
}

export function useScrollPosition() {
  const x = ref(0);
  const y = ref(0);

  const handleScroll = () => {
    x.value = window.scrollX;
    y.value = window.scrollY;
  };

  onMounted(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
  });

  onUnmounted(() => {
    window.removeEventListener("scroll", handleScroll);
  });

  return { x, y };
}
