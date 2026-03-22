import { beforeEach, describe, expect, it, vi } from "vitest";

describe("env configured RPC base URL", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    window.localStorage.clear();
  });

  it("rewrites a configured mainnet RPC base URL to testnet for RPC clients", async () => {
    vi.stubEnv("VITE_RPC_BASE_URL", "https://rpc-proxy.example.com/api/mainnet");

    const env = await import("../../src/utils/env.js");
    env.setCurrentEnv(env.NET_ENV.TestT5);

    expect(env.getRpcClientUrl()).toBe("https://rpc-proxy.example.com/api/testnet");
  });
});
