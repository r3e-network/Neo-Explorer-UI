import { useTheme } from "@/composables/useTheme";
import { vi, beforeEach, afterEach } from "vitest";

describe("useTheme", () => {
  let localStorageMock;

  beforeEach(() => {
    localStorageMock = {};
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key) => localStorageMock[key] ?? null),
      setItem: vi.fn((key, val) => {
        localStorageMock[key] = val;
      }),
    });
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("initTheme sets isDark to false when no saved theme", () => {
    const { isDark, initTheme } = useTheme();
    initTheme();
    expect(isDark.value).toBe(false);
  });

  it("initTheme restores dark theme from localStorage", () => {
    localStorageMock.theme = "dark";
    const { isDark, initTheme } = useTheme();
    initTheme();
    expect(isDark.value).toBe(true);
  });

  it("initTheme restores light theme from localStorage", () => {
    localStorageMock.theme = "light";
    const { isDark, initTheme } = useTheme();
    initTheme();
    expect(isDark.value).toBe(false);
  });

  it("toggleTheme flips isDark and persists to localStorage", () => {
    const { isDark, initTheme, toggleTheme } = useTheme();
    initTheme();
    expect(isDark.value).toBe(false);

    toggleTheme();
    expect(isDark.value).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith("theme", "dark");

    toggleTheme();
    expect(isDark.value).toBe(false);
    expect(localStorage.setItem).toHaveBeenCalledWith("theme", "light");
  });

  it("returns the same isDark ref across multiple calls (singleton)", () => {
    const a = useTheme();
    const b = useTheme();
    expect(a.isDark).toBe(b.isDark);
  });
});
