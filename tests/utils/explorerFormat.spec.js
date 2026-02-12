import { describe, it, expect } from "vitest";
import { truncateHash, formatUnixTime, formatAge, formatBytes, getTransactionTotalFee } from "../../src/utils/explorerFormat";

describe("explorerFormat", () => {
  it("truncates hash with defaults", () => {
    const hash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    expect(truncateHash(hash)).toBe("0x123456...abcdef");
  });

  it("returns empty string for missing hash", () => {
    expect(truncateHash()).toBe("");
  });

  it("formats unix time into local string", () => {
    expect(formatUnixTime(1704067200)).toContain("2024");
  });

  it("formats age text from unix timestamp", () => {
    const baseNow = new Date("2026-02-07T12:00:00Z").getTime();
    const baseSeconds = Math.floor(baseNow / 1000);
    expect(formatAge(baseSeconds - 12, baseNow)).toContain("secs ago");
    expect(formatAge(baseSeconds - 180, baseNow)).toContain("mins ago");
  });

  it("formats bytes with units", () => {
    expect(formatBytes(1000)).toBe("1000 B");
    expect(formatBytes(1024)).toBe("1.00 KB");
  });

  it("sums transaction net and system fees", () => {
    expect(getTransactionTotalFee({ netfee: 40000, sysfee: 1200000 })).toBe(1240000);
    expect(getTransactionTotalFee({ netfee: 0, sysfee: 0 })).toBe(0);
    expect(getTransactionTotalFee(null)).toBe(0);
  });
});
