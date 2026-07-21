import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const STORAGE_KEY = "neo_explorer_x_age_mode";

// The composable keeps one module-level ref (shared across all tables) and
// reads localStorage at module init, so each test re-imports a fresh module.
async function importAgeMode() {
  vi.resetModules();
  return import("../../src/composables/useAgeMode.js");
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe("useAgeMode", () => {
  it("defaults to age mode when nothing is stored", async () => {
    const { useAgeMode } = await importAgeMode();
    const { ageMode } = useAgeMode();
    expect(ageMode.value).toBe("age");
  });

  it("restores a stored utc mode and ignores junk values", async () => {
    localStorage.setItem(STORAGE_KEY, "utc");
    let mod = await importAgeMode();
    expect(mod.useAgeMode().ageMode.value).toBe("utc");

    localStorage.setItem(STORAGE_KEY, "banana");
    mod = await importAgeMode();
    expect(mod.useAgeMode().ageMode.value).toBe("age");
  });

  it("toggles the shared ref and persists to localStorage", async () => {
    const { useAgeMode } = await importAgeMode();
    const first = useAgeMode();
    const second = useAgeMode();

    first.toggleAgeMode();
    expect(first.ageMode.value).toBe("utc");
    // One shared ref: a second consumer sees the flip immediately.
    expect(second.ageMode.value).toBe("utc");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("utc");

    second.toggleAgeMode();
    expect(first.ageMode.value).toBe("age");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("age");
  });

  it("formatWhen switches between relative age and compact UTC", async () => {
    const { useAgeMode } = await importAgeMode();
    const { toggleAgeMode, formatWhen } = useAgeMode();

    const ts = Date.UTC(2026, 6, 21, 8, 30, 5); // 2026-07-21 08:30:05 UTC
    vi.useFakeTimers();
    vi.setSystemTime(ts + 5 * 60 * 1000);

    // Age mode: relative to the (faked) current time.
    expect(formatWhen(ts)).toBe("5m ago");
    // Explicit nowMs still wins over Date.now().
    expect(formatWhen(ts, ts + 12_000)).toBe("12s ago");

    toggleAgeMode();
    expect(formatWhen(ts)).toBe("2026-07-21 08:30:05");
    // nowMs is irrelevant in UTC mode.
    expect(formatWhen(ts, ts + 12_000)).toBe("2026-07-21 08:30:05");
  });

  it("formatWhen pads single-digit date parts in UTC mode", async () => {
    localStorage.setItem(STORAGE_KEY, "utc");
    const { useAgeMode } = await importAgeMode();
    const { formatWhen } = useAgeMode();
    expect(formatWhen(Date.UTC(2026, 0, 2, 3, 4, 5))).toBe("2026-01-02 03:04:05");
  });

  it("formatWhen returns an em dash for invalid timestamps in both modes", async () => {
    const { useAgeMode } = await importAgeMode();
    const { toggleAgeMode, formatWhen } = useAgeMode();
    expect(formatWhen(0)).toBe("—");
    expect(formatWhen(NaN)).toBe("—");
    toggleAgeMode();
    expect(formatWhen(0)).toBe("—");
    expect(formatWhen(undefined)).toBe("—");
  });
});
