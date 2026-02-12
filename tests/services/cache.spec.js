import { beforeEach, describe, expect, it, vi } from "vitest";
import { cachedRequest, clearAllCache, getCacheKey, getCacheMeta, isCacheFresh } from "../../src/services/cache.js";

describe("cache service", () => {
  beforeEach(() => {
    clearAllCache();
    vi.restoreAllMocks();
  });

  it("prefixes cache keys with active network", () => {
    const key = getCacheKey("tx_list", { limit: 10, skip: 0 });
    expect(key.startsWith("Mainnet:tx_list:")).toBe(true);
  });

  it("returns cached data for repeated requests", async () => {
    const fetchFn = vi.fn(async () => ({ ok: true }));

    const key = getCacheKey("cache_basic", {});
    const first = await cachedRequest(key, fetchFn, 1000);
    const second = await cachedRequest(key, fetchFn, 1000);

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("supports stale-while-revalidate background refresh", async () => {
    let counter = 0;
    const fetchFn = vi.fn(async () => ({ value: ++counter }));

    const key = getCacheKey("cache_swr", {});
    const first = await cachedRequest(key, fetchFn, 10_000, { staleWhileRevalidate: true, softTtl: 0 });
    const second = await cachedRequest(key, fetchFn, 10_000, { staleWhileRevalidate: true, softTtl: 0 });

    expect(first.value).toBe(1);
    expect(second.value).toBe(1);

    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const third = await cachedRequest(key, fetchFn, 10_000);
    expect(third.value).toBe(2);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("updates cache when forceRefresh is true", async () => {
    let counter = 0;
    const fetchFn = vi.fn(async () => ({ value: ++counter }));

    const key = getCacheKey("cache_force", {});
    const first = await cachedRequest(key, fetchFn, 10_000);
    const second = await cachedRequest(key, fetchFn, 10_000, { forceRefresh: true });

    expect(first.value).toBe(1);
    expect(second.value).toBe(2);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("exposes metadata and freshness helpers", async () => {
    const key = getCacheKey("cache_meta", {});
    await cachedRequest(key, async () => ({ ready: true }), 10_000);

    const meta = getCacheMeta(key);
    expect(meta).toBeTruthy();
    expect(meta?.remaining).toBeGreaterThan(0);
    expect(isCacheFresh(key, 10_000)).toBe(true);
  });
});
