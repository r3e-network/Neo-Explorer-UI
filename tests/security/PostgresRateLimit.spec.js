import { describe, expect, it, vi } from "vitest";
import {
  createPostgresRateLimiter,
  hasPostgresRateLimitConfig,
  hashRateLimitKey,
} from "../../api/lib/postgresRateLimit.js";
import { createDefaultRateLimiter } from "../../api/lib/relayerRateLimit.js";

function createQueryMock(counts = [1]) {
  let consumeIndex = 0;
  return vi.fn(async (sql) => {
    if (/returning request_count/i.test(sql)) {
      const request_count = counts[Math.min(consumeIndex, counts.length - 1)];
      consumeIndex += 1;
      return { rows: [{ request_count }] };
    }
    return { rows: [] };
  });
}

describe("Postgres shared rate limiter", () => {
  it("uses atomic hashed fixed-window counters", async () => {
    const queryImpl = createQueryMock([1, 3]);
    const limiter = createPostgresRateLimiter({ queryImpl, cleanupEvery: 0 });

    const first = await limiter.consume({
      key: "address-radar:mainnet:direct:203.0.113.10",
      windowMs: 60_000,
      maxRequests: 2,
      nowMs: 125_000,
    });
    const third = await limiter.consume({
      key: "address-radar:mainnet:direct:203.0.113.10",
      windowMs: 60_000,
      maxRequests: 2,
      nowMs: 125_500,
    });

    expect(limiter.isShared).toBe(true);
    expect(limiter.provider).toBe("postgres");
    expect(first).toMatchObject({ allowed: true, remaining: 1, resetAtMs: 180_000 });
    expect(third).toMatchObject({ allowed: false, remaining: 0, resetAtMs: 180_000 });

    const consumeCalls = queryImpl.mock.calls.filter(([sql]) => /returning request_count/i.test(sql));
    expect(consumeCalls).toHaveLength(2);
    expect(consumeCalls[0][1][0]).toMatch(/^[a-f0-9]{64}$/);
    expect(consumeCalls[0][1][0]).not.toContain("203.0.113.10");
    expect(consumeCalls[0][1][1]).toBe(120_000);
    expect(queryImpl.mock.calls.filter(([sql]) => /create table/i.test(sql))).toHaveLength(1);
  });

  it("propagates counter failures so callers fail closed", async () => {
    const queryImpl = vi.fn(async (sql) => {
      if (/returning request_count/i.test(sql)) throw new Error("database unavailable");
      return { rows: [] };
    });
    const limiter = createPostgresRateLimiter({ queryImpl, cleanupEvery: 0 });

    await expect(limiter.consume({ key: "test", windowMs: 1000, maxRequests: 1 })).rejects.toThrow(
      "database unavailable",
    );
  });

  it("selects Postgres when Redis is absent on Vercel", async () => {
    const queryImpl = createQueryMock([1]);
    const limiter = createDefaultRateLimiter({
      env: { VERCEL: "1", DATABASE_URL: "postgres://example.invalid/db" },
      postgresQueryImpl: queryImpl,
    });

    expect(limiter.isShared).toBe(true);
    expect(limiter.provider).toBe("postgres");
    await expect(limiter.consume({ key: "test", windowMs: 1000, maxRequests: 2, nowMs: 1000 })).resolves.toMatchObject({
      allowed: true,
      remaining: 1,
    });
  });

  it("uses Postgres when an Upstash request fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const limiter = createDefaultRateLimiter({
      env: {
        VERCEL: "1",
        KV_REST_API_URL: "https://missing.invalid",
        KV_REST_API_TOKEN: "stale-token",
        DATABASE_URL: "postgres://example.invalid/db",
      },
      fetchImpl: vi.fn().mockRejectedValue(new Error("dns failure")),
      postgresQueryImpl: createQueryMock([1]),
    });

    await expect(limiter.consume({ key: "test", windowMs: 1000, maxRequests: 2, nowMs: 1000 })).resolves.toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("secondary shared limiter"));
    warnSpy.mockRestore();
  });

  it("detects database aliases and hashes keys deterministically", () => {
    expect(hasPostgresRateLimitConfig({ DATABASE_URL: "postgres://db" })).toBe(true);
    expect(hasPostgresRateLimitConfig({ POSTGRES_URL: "postgres://db" })).toBe(true);
    expect(hasPostgresRateLimitConfig({})).toBe(false);
    expect(hashRateLimitKey("same-key")).toBe(hashRateLimitKey("same-key"));
    expect(hashRateLimitKey("same-key")).not.toBe(hashRateLimitKey("other-key"));
  });
});
