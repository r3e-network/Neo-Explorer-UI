import { ref, watch } from "vue";

const isDark = ref(false);

const applyTheme = () => {
  if (isDark.value) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
};

// Register watcher once at module level -- avoids accumulation when
// multiple components call useTheme().
watch(isDark, applyTheme);

export function useTheme() {
  const initTheme = () => {
    const saved = localStorage.getItem("theme");
    if (saved) {
      isDark.value = saved === "dark";
    } else {
      isDark.value = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
  };

  const toggleTheme = () => {
    isDark.value = !isDark.value;
    localStorage.setItem("theme", isDark.value ? "dark" : "light");
  };

  return { isDark, initTheme, toggleTheme };
}
