import { ref, watch } from "vue";

const THEME_STORAGE_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
const isDark = ref(false);
let followsSystemTheme = true;
let removeSystemThemeListener = null;

const applyTheme = () => {
  if (isDark.value) {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  } else {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  }
};

// Register watcher once at module level -- avoids accumulation when
// multiple components call useTheme().
watch(isDark, applyTheme);

function getThemeStorage() {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    // Storage can throw in restricted/private contexts. In that case the
    // application should still render with the system/default light theme.
  }
  return null;
}

function getStoredTheme() {
  const stored = getThemeStorage()?.getItem(THEME_STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : null;
}

function getSystemThemeQuery() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  return window.matchMedia(DARK_QUERY);
}

function stopFollowingSystemTheme() {
  if (removeSystemThemeListener) {
    removeSystemThemeListener();
    removeSystemThemeListener = null;
  }
}

function followSystemTheme() {
  stopFollowingSystemTheme();
  const mediaQuery = getSystemThemeQuery();
  followsSystemTheme = true;
  isDark.value = Boolean(mediaQuery?.matches);
  applyTheme();

  if (!mediaQuery) return;

  const handleSystemThemeChange = (event) => {
    if (!followsSystemTheme) return;
    isDark.value = Boolean(event.matches);
    applyTheme();
  };

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", handleSystemThemeChange);
    removeSystemThemeListener = () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  } else if (typeof mediaQuery.addListener === "function") {
    mediaQuery.addListener(handleSystemThemeChange);
    removeSystemThemeListener = () => mediaQuery.removeListener(handleSystemThemeChange);
  }
}

export function useTheme() {
  const initTheme = () => {
    const saved = getStoredTheme();
    if (!saved) {
      followSystemTheme();
      return;
    }

    followsSystemTheme = false;
    stopFollowingSystemTheme();
    isDark.value = saved === "dark";
    applyTheme();
  };

  const toggleTheme = () => {
    followsSystemTheme = false;
    stopFollowingSystemTheme();
    isDark.value = !isDark.value;
    applyTheme();
    getThemeStorage()?.setItem(THEME_STORAGE_KEY, isDark.value ? "dark" : "light");
  };

  return { isDark, initTheme, toggleTheme };
}
