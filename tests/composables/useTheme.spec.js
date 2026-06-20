import { useTheme } from "@/composables/useTheme";
import { vi, beforeEach, afterEach } from "vitest";

describe("useTheme", () => {
  let localStorageMock;
  let originalLocalStorage;
  let originalMatchMedia;

  function mockMatchMedia(initialMatches = false) {
    let matches = initialMatches;
    const listeners = new Set();
    const mediaQuery = {
      media: "(prefers-color-scheme: dark)",
      get matches() {
        return matches;
      },
      addEventListener: vi.fn((event, listener) => {
        if (event === "change") listeners.add(listener);
      }),
      removeEventListener: vi.fn((event, listener) => {
        if (event === "change") listeners.delete(listener);
      }),
      addListener: vi.fn((listener) => listeners.add(listener)),
      removeListener: vi.fn((listener) => listeners.delete(listener)),
      dispatch(nextMatches) {
        matches = nextMatches;
        listeners.forEach((listener) => listener({ matches, media: this.media }));
      },
    };

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn(() => mediaQuery),
    });

    return mediaQuery;
  }

  beforeEach(() => {
    localStorageMock = {};
    originalLocalStorage = window.localStorage;
    originalMatchMedia = window.matchMedia;
    const storage = {
      getItem: vi.fn((key) => localStorageMock[key] ?? null),
      setItem: vi.fn((key, val) => {
        localStorageMock[key] = val;
      }),
    };
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });
    vi.stubGlobal("localStorage", storage);
    mockMatchMedia(false);
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";
  });

  afterEach(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
    });
    if (originalMatchMedia) {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    } else {
      delete window.matchMedia;
    }
    vi.unstubAllGlobals();
  });

  it("initTheme follows system dark mode when no theme is saved", () => {
    mockMatchMedia(true);
    const { isDark, initTheme } = useTheme();
    initTheme();
    expect(isDark.value).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("initTheme defaults to light when there is no saved theme and no system dark preference", () => {
    const { isDark, initTheme } = useTheme();
    initTheme();
    expect(isDark.value).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("initTheme defaults to light when system color-scheme detection is unavailable", () => {
    delete window.matchMedia;
    const { isDark, initTheme } = useTheme();
    initTheme();
    expect(isDark.value).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("reacts to system color-scheme changes while following system theme", () => {
    const mediaQuery = mockMatchMedia(false);
    const { isDark, initTheme } = useTheme();
    initTheme();
    expect(isDark.value).toBe(false);

    mediaQuery.dispatch(true);
    expect(isDark.value).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    mediaQuery.dispatch(false);
    expect(isDark.value).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
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

  it("keeps saved theme independent from system changes", () => {
    localStorageMock.theme = "light";
    const mediaQuery = mockMatchMedia(false);
    const { isDark, initTheme } = useTheme();
    initTheme();

    mediaQuery.dispatch(true);
    expect(isDark.value).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
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
