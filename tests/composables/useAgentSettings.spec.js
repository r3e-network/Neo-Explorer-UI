import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const PREFS_KEY = "neo_explorer_agent_settings";
const KEY_STORAGE_KEY = "neo_explorer_agent_byok_key";

// The composable keeps one module-level singleton and reads storage at import
// time, so each test re-imports a fresh module against fresh mock storage.
async function importSettings() {
  vi.resetModules();
  return import("../../src/composables/useAgentSettings.js");
}

// In-memory Storage mocks backed by plain objects. Backing the two stores
// separately lets us assert exactly which store a value landed in and lets the
// values survive a module re-import (a "reload") the way real storage would.
let localBacking;
let sessionBacking;
const originalLocalStorage = window.localStorage;
const originalSessionStorage = window.sessionStorage;

function makeStorage(backing) {
  return {
    getItem: vi.fn((key) => (Object.prototype.hasOwnProperty.call(backing, key) ? backing[key] : null)),
    setItem: vi.fn((key, value) => {
      backing[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
      delete backing[key];
    }),
  };
}

function installStorage(local, session) {
  Object.defineProperty(window, "localStorage", { configurable: true, value: local });
  Object.defineProperty(window, "sessionStorage", { configurable: true, value: session });
}

beforeEach(() => {
  localBacking = {};
  sessionBacking = {};
  installStorage(makeStorage(localBacking), makeStorage(sessionBacking));
});

afterEach(() => {
  Object.defineProperty(window, "localStorage", { configurable: true, value: originalLocalStorage });
  Object.defineProperty(window, "sessionStorage", { configurable: true, value: originalSessionStorage });
  vi.restoreAllMocks();
});

describe("useAgentSettings", () => {
  it("exports the fixed base-URL allowlist", async () => {
    const { ALLOWED_BASE_URLS } = await importSettings();
    expect(ALLOWED_BASE_URLS).toEqual(["https://api.deepseek.com/anthropic", "https://api.anthropic.com"]);
  });

  it("defaults to hosted mode with empty prefs and key", async () => {
    const { useAgentSettings } = await importSettings();
    const s = useAgentSettings();
    expect(s.mode.value).toBe("hosted");
    expect(s.model.value).toBe("");
    expect(s.baseUrl.value).toBe("");
    expect(s.rememberKey.value).toBe(false);
    expect(s.apiKey.value).toBe("");
    expect(s.isByokReady.value).toBe(false);
    expect(s.activeMode.value).toBe("hosted");
  });

  it("returns the same singleton refs and setters across calls", async () => {
    const { useAgentSettings } = await importSettings();
    const a = useAgentSettings();
    const b = useAgentSettings();
    expect(a.mode).toBe(b.mode);
    expect(a.apiKey).toBe(b.apiKey);
    expect(a.setMode).toBe(b.setMode);
    expect(a.clearKey).toBe(b.clearKey);
  });

  describe("non-secret preferences (localStorage)", () => {
    it("persists mode/model/baseUrl to the settings key and round-trips on reload", async () => {
      let mod = await importSettings();
      const s = mod.useAgentSettings();
      s.setMode("byok");
      s.setModel("deepseek-chat");
      s.setBaseUrl("https://api.anthropic.com");

      expect(JSON.parse(localBacking[PREFS_KEY])).toEqual({
        mode: "byok",
        model: "deepseek-chat",
        baseUrl: "https://api.anthropic.com",
        rememberKey: false,
      });

      // Re-import (simulate reload) -- prefs restore from localStorage.
      mod = await importSettings();
      const reloaded = mod.useAgentSettings();
      expect(reloaded.mode.value).toBe("byok");
      expect(reloaded.model.value).toBe("deepseek-chat");
      expect(reloaded.baseUrl.value).toBe("https://api.anthropic.com");
    });

    it("ignores an invalid mode and junk stored prefs", async () => {
      let mod = await importSettings();
      let s = mod.useAgentSettings();
      s.setMode("byok");
      s.setMode("nonsense");
      expect(s.mode.value).toBe("byok");

      localBacking[PREFS_KEY] = "{not json";
      mod = await importSettings();
      s = mod.useAgentSettings();
      expect(s.mode.value).toBe("hosted");
    });

    it("coerces a non-allowlisted base URL back to the default", async () => {
      const { useAgentSettings } = await importSettings();
      const s = useAgentSettings();
      s.setBaseUrl("https://api.anthropic.com");
      expect(s.baseUrl.value).toBe("https://api.anthropic.com");

      s.setBaseUrl("https://evil.example.com/anthropic");
      expect(s.baseUrl.value).toBe("");
      expect(JSON.parse(localBacking[PREFS_KEY]).baseUrl).toBe("");
    });

    it("does not restore a non-allowlisted base URL from tampered storage", async () => {
      localBacking[PREFS_KEY] = JSON.stringify({ mode: "byok", baseUrl: "http://169.254.169.254" });
      const { useAgentSettings } = await importSettings();
      expect(useAgentSettings().baseUrl.value).toBe("");
    });
  });

  describe("BYOK key storage rule (session vs remember)", () => {
    it("keeps the key in sessionStorage only while remember is off", async () => {
      const { useAgentSettings } = await importSettings();
      const s = useAgentSettings();
      s.setApiKey("sk-session");
      expect(sessionBacking[KEY_STORAGE_KEY]).toBe("sk-session");
      expect(localBacking[KEY_STORAGE_KEY]).toBeUndefined();
    });

    it("round-trips a session-only key across reload via sessionStorage", async () => {
      let mod = await importSettings();
      mod.useAgentSettings().setApiKey("sk-session");

      mod = await importSettings();
      const reloaded = mod.useAgentSettings();
      expect(reloaded.apiKey.value).toBe("sk-session");
    });

    it("mirrors the key to localStorage when remember is turned on", async () => {
      const { useAgentSettings } = await importSettings();
      const s = useAgentSettings();
      s.setApiKey("sk-remember");
      s.setRememberKey(true);
      expect(localBacking[KEY_STORAGE_KEY]).toBe("sk-remember");
      expect(sessionBacking[KEY_STORAGE_KEY]).toBe("sk-remember");
    });

    it("round-trips a remembered key across reload, preferring localStorage", async () => {
      let mod = await importSettings();
      let s = mod.useAgentSettings();
      s.setRememberKey(true);
      s.setApiKey("sk-remembered");
      expect(localBacking[KEY_STORAGE_KEY]).toBe("sk-remembered");

      mod = await importSettings();
      s = mod.useAgentSettings();
      expect(s.rememberKey.value).toBe(true);
      expect(s.apiKey.value).toBe("sk-remembered");
    });

    it("prefers localStorage over sessionStorage when both hold a key", async () => {
      localBacking[KEY_STORAGE_KEY] = "sk-local";
      sessionBacking[KEY_STORAGE_KEY] = "sk-session";
      const { useAgentSettings } = await importSettings();
      expect(useAgentSettings().apiKey.value).toBe("sk-local");
    });

    it("purges the key from BOTH stores when remember is turned off", async () => {
      const { useAgentSettings } = await importSettings();
      const s = useAgentSettings();
      s.setRememberKey(true);
      s.setApiKey("sk-both");
      expect(localBacking[KEY_STORAGE_KEY]).toBe("sk-both");
      expect(sessionBacking[KEY_STORAGE_KEY]).toBe("sk-both");

      s.setRememberKey(false);
      expect(localBacking[KEY_STORAGE_KEY]).toBeUndefined();
      expect(sessionBacking[KEY_STORAGE_KEY]).toBeUndefined();
      // remember=false is itself persisted to prefs
      expect(JSON.parse(localBacking[PREFS_KEY]).rememberKey).toBe(false);
    });

    it("clearKey empties the ref and purges BOTH stores", async () => {
      const { useAgentSettings } = await importSettings();
      const s = useAgentSettings();
      s.setRememberKey(true);
      s.setApiKey("sk-clear");
      expect(localBacking[KEY_STORAGE_KEY]).toBe("sk-clear");

      s.clearKey();
      expect(s.apiKey.value).toBe("");
      expect(localBacking[KEY_STORAGE_KEY]).toBeUndefined();
      expect(sessionBacking[KEY_STORAGE_KEY]).toBeUndefined();
    });

    it("purges storage instead of writing a blank key", async () => {
      const { useAgentSettings } = await importSettings();
      const s = useAgentSettings();
      s.setApiKey("sk-live");
      expect(sessionBacking[KEY_STORAGE_KEY]).toBe("sk-live");

      s.setApiKey("");
      expect(sessionBacking[KEY_STORAGE_KEY]).toBeUndefined();
      expect(localBacking[KEY_STORAGE_KEY]).toBeUndefined();
    });
  });

  describe("activeMode fallback", () => {
    it("stays hosted while a byok key is empty or whitespace", async () => {
      const { useAgentSettings } = await importSettings();
      const s = useAgentSettings();
      s.setMode("byok");
      expect(s.isByokReady.value).toBe(false);
      expect(s.activeMode.value).toBe("hosted");

      s.setApiKey("   ");
      expect(s.isByokReady.value).toBe(false);
      expect(s.activeMode.value).toBe("hosted");
    });

    it("becomes byok once a non-empty key is present, and reverts on clear", async () => {
      const { useAgentSettings } = await importSettings();
      const s = useAgentSettings();
      s.setMode("byok");
      s.setApiKey("sk-live");
      expect(s.isByokReady.value).toBe(true);
      expect(s.activeMode.value).toBe("byok");

      s.clearKey();
      expect(s.activeMode.value).toBe("hosted");
    });

    it("stays hosted with a key present while mode is hosted", async () => {
      const { useAgentSettings } = await importSettings();
      const s = useAgentSettings();
      s.setApiKey("sk-live");
      expect(s.mode.value).toBe("hosted");
      expect(s.activeMode.value).toBe("hosted");
    });
  });

  describe("private-mode safety (throwing storage)", () => {
    function throwingStorage() {
      return {
        getItem: () => {
          throw new Error("storage denied");
        },
        setItem: () => {
          throw new Error("storage denied");
        },
        removeItem: () => {
          throw new Error("storage denied");
        },
      };
    }

    it("loads defaults and never throws when storage is unavailable", async () => {
      installStorage(throwingStorage(), throwingStorage());

      const { useAgentSettings } = await importSettings();
      const s = useAgentSettings();
      // Import-time reads swallowed the throw and fell back to defaults.
      expect(s.mode.value).toBe("hosted");
      expect(s.apiKey.value).toBe("");

      // Every setter degrades to in-memory-only rather than throwing.
      expect(() => s.setMode("byok")).not.toThrow();
      expect(() => s.setModel("deepseek-chat")).not.toThrow();
      expect(() => s.setBaseUrl("https://api.anthropic.com")).not.toThrow();
      expect(() => s.setApiKey("sk-live")).not.toThrow();
      expect(() => s.setRememberKey(true)).not.toThrow();
      expect(() => s.setRememberKey(false)).not.toThrow();
      expect(() => s.clearKey()).not.toThrow();

      // In-memory reactive state still works despite zero persistence.
      s.setMode("byok");
      s.setApiKey("sk-live");
      expect(s.activeMode.value).toBe("byok");
    });
  });
});
