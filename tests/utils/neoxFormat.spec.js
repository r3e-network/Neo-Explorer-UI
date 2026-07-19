import { describe, it, expect, vi, afterEach } from "vitest";
import { formatUnits, formatGas, formatGwei, shortHash, formatInt, formatTimestamp, timeAgo } from "../../src/utils/neoxFormat.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("neoxFormat formatUnits", () => {
  it("formats 18-decimal wei with grouping and trimmed fraction", () => {
    expect(formatUnits("1000000000000000000", 18)).toBe("1");
    expect(formatUnits("5570332160000000", 18)).toBe("0.00557"); // trailing zeros trimmed
    expect(formatUnits("2311928577311989879812", 18)).toBe("2,311.928577");
  });

  it("stays BigInt-exact far beyond Number.MAX_SAFE_INTEGER", () => {
    // 10^30 wei = 10^12 GAS — Number would lose precision here.
    expect(formatUnits("1000000000000000000000000000000", 18)).toBe("1,000,000,000,000");
  });

  it("handles zero decimals (ERC-1155 whole units), negatives and junk", () => {
    expect(formatUnits("5", 0)).toBe("5");
    expect(formatUnits("-1500000000000000000", 18)).toBe("-1.5");
    expect(formatUnits(null)).toBe("0");
    expect(formatUnits("not-hex")).toBe("0");
  });

  it("respects maxFractionDigits", () => {
    expect(formatUnits("1234567890000000000", 18, 2)).toBe("1.23");
  });
});

describe("neoxFormat formatGas / formatGwei", () => {
  it("uses 18 decimals for GAS and 9 for gwei", () => {
    expect(formatGas("128313000000000000")).toBe("0.128313");
    expect(formatGwei("45000000000")).toBe("45");
    expect(formatGwei("42940000000")).toBe("42.94");
  });
});

describe("neoxFormat shortHash", () => {
  it("middle-truncates and preserves the 0x prefix", () => {
    expect(shortHash("0xdE41591ED1f8ED1484aC2CD8Ca0876428de60EfF")).toBe("0xdE4159…0EfF");
    expect(shortHash("0xdE41591ED1f8ED1484aC2CD8Ca0876428de60EfF").startsWith("0xdE4159")).toBe(true);
      });

  it("returns short values untouched", () => {
    expect(shortHash("0xabc")).toBe("0xabc");
    expect(shortHash("")).toBe("");
  });
});

describe("neoxFormat formatInt / formatTimestamp / timeAgo", () => {
  it("groups integers and dashes invalid input", () => {
    expect(formatInt("60000000")).toBe("60,000,000");
    expect(formatInt(undefined)).toBe("0");
  });

  it("formats timestamps and relative ages", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T12:00:00Z"));
    expect(timeAgo(Date.parse("2026-07-20T11:59:30Z"))).toBe("30s ago");
    expect(timeAgo(Date.parse("2026-07-20T11:15:00Z"))).toBe("45m ago");
    expect(timeAgo(Date.parse("2026-07-19T12:00:00Z"))).toBe("1d ago");
    expect(timeAgo(0)).toBe("—");
    expect(formatTimestamp(0)).toBe("—");
    expect(formatTimestamp(Date.parse("2026-07-20T11:00:00Z"))).toBeTruthy();
  });
});
