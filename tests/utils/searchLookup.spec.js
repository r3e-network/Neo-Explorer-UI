import { describe, expect, it, vi } from "vitest";
import { resolveSearchResultWithTimeout } from "@/utils/searchLookup";

describe("resolveSearchResultWithTimeout", () => {
  it("returns lookup result when it resolves before timeout", async () => {
    const searchFn = vi.fn(async () => ({ type: "block", data: { index: 123 } }));

    const result = await resolveSearchResultWithTimeout(searchFn, "123", 100);

    expect(searchFn).toHaveBeenCalledWith("123");
    expect(result).toEqual({ type: "block", data: { index: 123 } });
  });

  it("returns null when lookup throws", async () => {
    const searchFn = vi.fn(async () => {
      throw new Error("lookup failed");
    });

    const result = await resolveSearchResultWithTimeout(searchFn, "abc", 100);

    expect(result).toBeNull();
  });

  it("returns null when lookup exceeds timeout", async () => {
    vi.useFakeTimers();
    try {
      const searchFn = vi.fn(() => new Promise((resolve) => setTimeout(() => resolve({ type: "tx" }), 500)));

      const pending = resolveSearchResultWithTimeout(searchFn, "0xabc", 50);
      await vi.advanceTimersByTimeAsync(60);

      await expect(pending).resolves.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
