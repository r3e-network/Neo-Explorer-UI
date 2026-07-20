import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/env", () => ({ getCurrentEnv: () => "Mainnet" }));

const SESSION_CACHE_KEY = "neo_explorer_session_cache";

describe("cache session persistence", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.resetModules();
  });

  it("restores cache entries written with the current data schema", async () => {
    const now = Date.now();
    sessionStorage.setItem(
      SESSION_CACHE_KEY,
      JSON.stringify([
        ["persisted", { data: { rows: [1, 2, 3] }, expiry: now + 60_000, timestamp: now, ttl: 60_000 }],
      ]),
    );

    const { getCache } = await import("@/services/cache");
    expect(getCache("persisted")).toEqual({ rows: [1, 2, 3] });
  });

  it("rejects legacy or malformed entries without a data field", async () => {
    const now = Date.now();
    sessionStorage.setItem(
      SESSION_CACHE_KEY,
      JSON.stringify([
        ["malformed", { value: "injected", expiry: now + 60_000, timestamp: now, ttl: 60_000 }],
      ]),
    );

    const { getCache } = await import("@/services/cache");
    expect(getCache("malformed")).toBeNull();
  });
});

