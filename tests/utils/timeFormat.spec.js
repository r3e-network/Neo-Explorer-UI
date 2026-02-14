import { formatDateTime, formatUnixTime, formatTime, formatAge } from "@/utils/timeFormat";

describe("formatDateTime", () => {
  it("formats a unix timestamp in seconds", () => {
    // 2023-01-01T00:00:00Z = 1672531200
    const result = formatDateTime(1672531200);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    // Should contain "2023" somewhere in the locale string
    expect(result).toContain("2023");
  });

  it("formats a unix timestamp in milliseconds", () => {
    const result = formatDateTime(1672531200000);
    expect(result).toContain("2023");
  });

  it("returns empty string for falsy values", () => {
    expect(formatDateTime(0)).toBe("");
    expect(formatDateTime(null)).toBe("");
    expect(formatDateTime(undefined)).toBe("");
  });
});

describe("formatUnixTime / formatTime aliases", () => {
  it("formatUnixTime is the same function as formatDateTime", () => {
    expect(formatUnixTime).toBe(formatDateTime);
  });

  it("formatTime is the same function as formatDateTime", () => {
    expect(formatTime).toBe(formatDateTime);
  });
});

describe("formatAge", () => {
  const NOW = 1700000000000; // fixed "now" in ms

  it("returns seconds ago for < 60s", () => {
    const ts = NOW / 1000 - 30; // 30 seconds ago (in seconds)
    expect(formatAge(ts, NOW)).toBe("30 secs ago");
  });

  it("returns 0 secs ago for current timestamp", () => {
    const ts = NOW / 1000;
    expect(formatAge(ts, NOW)).toBe("0 secs ago");
  });

  it("returns minutes ago for 60s..3599s", () => {
    const ts = NOW / 1000 - 120; // 2 minutes ago
    expect(formatAge(ts, NOW)).toBe("2 mins ago");
  });

  it("returns hours ago for 3600s..86399s", () => {
    const ts = NOW / 1000 - 7200; // 2 hours ago
    expect(formatAge(ts, NOW)).toBe("2 hrs ago");
  });

  it("returns days ago for >= 86400s", () => {
    const ts = NOW / 1000 - 172800; // 2 days ago
    expect(formatAge(ts, NOW)).toBe("2 days ago");
  });

  it("handles millisecond timestamps", () => {
    const tsMs = NOW - 30000; // 30 seconds ago in ms
    expect(formatAge(tsMs, NOW)).toBe("30 secs ago");
  });

  it("returns empty string for falsy values", () => {
    expect(formatAge(0)).toBe("");
    expect(formatAge(null)).toBe("");
    expect(formatAge(undefined)).toBe("");
  });

  it("clamps negative differences to 0", () => {
    // timestamp in the future relative to nowMs
    const futureTs = NOW / 1000 + 9999;
    expect(formatAge(futureTs, NOW)).toBe("0 secs ago");
  });
});
