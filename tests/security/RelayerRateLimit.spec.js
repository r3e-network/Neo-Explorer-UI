import { describe, expect, it, vi } from "vitest";
import {
  buildRateLimitKey,
  buildRateLimitKeys,
  createDefaultRateLimiter,
  createInMemoryRateLimiter,
  createUpstashRateLimiter,
  enforceRelayerRateLimit,
  resolveRateLimitPolicy,
  resolveUpstashConfig,
} from "../../api/lib/relayerRateLimit.js";

function createMockRes() {
  return {
    headers: {},
    statusCode: 200,
    payload: null,
    setHeader(name, value) {
      this.headers[name] = String(value);
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
}

describe("relayer rate-limit behavior", () => {
  it("scopes keys by ip/account/action/network", () => {
    const key = buildRateLimitKey({
      ip: "203.0.113.10",
      accountId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      action: "execute",
      network: "mainnet",
    });
    expect(key).toContain("203.0.113.10");
    expect(key).toContain("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(key).toContain("execute");
    expect(key).toContain("mainnet");
  });

  it("derives both ip-only and ip-account keys to resist account rotation bypass", () => {
    const keys = buildRateLimitKeys({
      ip: "203.0.113.10",
      accountId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      action: "execute",
      network: "mainnet",
    });
    expect(Array.isArray(keys)).toBe(true);
    expect(keys.length).toBeGreaterThanOrEqual(2);
    const joined = keys.join("|");
    expect(joined).toContain("iponly");
    expect(joined).toContain("ipacct");
  });

  it("uses stricter policy for execute than prepare", () => {
    const prepare = resolveRateLimitPolicy("prepare");
    const execute = resolveRateLimitPolicy("execute");
    expect(prepare.windowMs).toBeGreaterThan(0);
    expect(execute.windowMs).toBeGreaterThan(0);
    expect(execute.maxRequests).toBeLessThan(prepare.maxRequests);
  });

  it("blocks after threshold and provides retry metadata", () => {
    const limiter = createInMemoryRateLimiter();
    const key = "rl:test-key";
    const policy = { windowMs: 1_000, maxRequests: 2 };

    const first = limiter.consume({ key, ...policy, nowMs: 10_000 });
    const second = limiter.consume({ key, ...policy, nowMs: 10_100 });
    const third = limiter.consume({ key, ...policy, nowMs: 10_200 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
    expect(third.remaining).toBe(0);
  });

  it("resets window and cleans stale keys", () => {
    const limiter = createInMemoryRateLimiter({ cleanupEvery: 1 });
    const policy = { windowMs: 1_000, maxRequests: 1 };

    limiter.consume({ key: "rl:a", ...policy, nowMs: 1_000 });
    expect(limiter.getTrackedKeyCount()).toBe(1);

    const afterWindow = limiter.consume({ key: "rl:a", ...policy, nowMs: 2_500 });
    expect(afterWindow.allowed).toBe(true);

    limiter.consume({ key: "rl:b", ...policy, nowMs: 2_500 });
    expect(limiter.getTrackedKeyCount()).toBe(2);

    limiter.consume({ key: "rl:c", ...policy, nowMs: 5_000 });
    expect(limiter.getTrackedKeyCount()).toBeLessThanOrEqual(2);
  });

  it("enforcer returns 429 with headers once limit is exceeded", async () => {
    const limiter = createInMemoryRateLimiter();
    const req = {
      headers: { "x-forwarded-for": "198.51.100.12" },
      socket: { remoteAddress: "198.51.100.12" },
    };
    const res1 = createMockRes();
    const res2 = createMockRes();

    const policy = { windowMs: 60_000, maxRequests: 1 };
    const first = await enforceRelayerRateLimit({
      req,
      res: res1,
      accountId: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      action: "execute",
      network: "testnet",
      limiter,
      policy,
      nowMs: 1000,
    });
    const second = await enforceRelayerRateLimit({
      req,
      res: res2,
      accountId: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      action: "execute",
      network: "testnet",
      limiter,
      policy,
      nowMs: 1001,
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(res2.statusCode).toBe(429);
    expect(res2.headers["Retry-After"]).toBeDefined();
    expect(res2.headers["X-RateLimit-Limit"]).toBe("1");
    expect(res2.headers["X-RateLimit-Remaining"]).toBe("0");
    expect(String(res2.payload?.error || "")).toContain("Rate limit exceeded");
  });

  it("ignores forwarded ip headers unless trustProxy is enabled", async () => {
    const consumedKeys = [];
    const limiter = {
      consume({ key }) {
        consumedKeys.push(key);
        return {
          allowed: true,
          limit: 10,
          remaining: 9,
          resetAtMs: 2000,
          retryAfterSeconds: 1,
        };
      },
    };

    const req = {
      headers: { "x-forwarded-for": "198.51.100.50" },
      socket: { remoteAddress: "203.0.113.8" },
    };
    const resA = createMockRes();
    const resB = createMockRes();

    await enforceRelayerRateLimit({
      req,
      res: resA,
      accountId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      action: "execute",
      network: "testnet",
      limiter,
      policy: { windowMs: 60_000, maxRequests: 10 },
      trustProxy: false,
      nowMs: 1000,
    });
    await enforceRelayerRateLimit({
      req,
      res: resB,
      accountId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      action: "execute",
      network: "testnet",
      limiter,
      policy: { windowMs: 60_000, maxRequests: 10 },
      trustProxy: true,
      nowMs: 1001,
    });

    const firstCallKeys = consumedKeys.slice(0, 2).join("|");
    const secondCallKeys = consumedKeys.slice(2, 4).join("|");
    expect(firstCallKeys).toContain("203.0.113.8");
    expect(firstCallKeys).not.toContain("198.51.100.50");
    expect(secondCallKeys).toContain("198.51.100.50");
  });

  it("resolves upstash config from environment aliases", () => {
    const cfg = resolveUpstashConfig({
      KV_REST_API_URL: "https://demo.upstash.io",
      KV_REST_API_TOKEN: "token-123",
    });
    expect(cfg?.url).toBe("https://demo.upstash.io");
    expect(cfg?.token).toBe("token-123");
  });

  it("uses upstash shared limiter when configured", () => {
    const limiter = createDefaultRateLimiter({
      env: {
        UPSTASH_REDIS_REST_URL: "https://demo.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "token-123",
      },
      fetchImpl: vi.fn(),
    });
    expect(limiter.isShared).toBe(true);
  });

  it("falls back to in-memory limiter when upstash request fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failingFetch = vi.fn().mockRejectedValue(new Error("network down"));
    const fallbackLimiter = createInMemoryRateLimiter();
    const limiter = createUpstashRateLimiter({
      url: "https://demo.upstash.io",
      token: "token-123",
      fetchImpl: failingFetch,
      fallbackLimiter,
    });

    const policy = { windowMs: 60_000, maxRequests: 1 };
    const first = await limiter.consume({ key: "rl:shared-fallback", ...policy, nowMs: 1000 });
    const second = await limiter.consume({ key: "rl:shared-fallback", ...policy, nowMs: 1001 });
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    warnSpy.mockRestore();
  });

  it("parses upstash script results for distributed counters", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: [1, 3, 5000] }),
    });
    const limiter = createUpstashRateLimiter({
      url: "https://demo.upstash.io",
      token: "token-123",
      fetchImpl,
    });

    const result = await limiter.consume({
      key: "relayer:test:execute:ip:acct",
      windowMs: 60_000,
      maxRequests: 10,
      nowMs: 10_000,
    });

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(10);
    expect(result.remaining).toBe(7);
    expect(result.retryAfterSeconds).toBe(5);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("fails closed when shared limiter is unavailable and fallback is disabled", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failingFetch = vi.fn().mockRejectedValue(new Error("upstash down"));
    const limiter = createUpstashRateLimiter({
      url: "https://demo.upstash.io",
      token: "token-123",
      fetchImpl: failingFetch,
      fallbackOnError: false,
    });

    await expect(
      limiter.consume({
        key: "relayer:test:execute:ip:acct",
        windowMs: 60_000,
        maxRequests: 10,
        nowMs: 10_000,
      })
    ).rejects.toThrow(/shared limiter unavailable/i);
    warnSpy.mockRestore();
  });
});
