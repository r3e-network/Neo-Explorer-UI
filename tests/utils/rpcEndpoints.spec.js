import { beforeEach, describe, expect, it, vi } from "vitest";

describe("rpcEndpoints configured base URL", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    window.localStorage.clear();
  });

  it("uses testnet primary and fallback candidates for a configured mainnet network-aware base URL", async () => {
    vi.stubEnv("VITE_RPC_BASE_URL", "https://rpc-proxy.example.com/api/mainnet");

    const env = await import("../../src/utils/env.js");
    env.setCurrentEnv(env.NET_ENV.TestT5);

    const { getRpcEndpointCandidates } = await import("../../src/utils/rpcEndpoints.js");

    expect(getRpcEndpointCandidates()).toEqual([
      "https://rpc-proxy.example.com/api/testnet/primary",
      "https://rpc-proxy.example.com/api/testnet/fallback",
      "https://rpc-proxy.example.com/api/testnet/fallback2",
      "https://rpc-proxy.example.com/api/testnet/fallback3",
    ]);
  });

  it("defaults to same-origin primary and fallback proxy routes", async () => {
    const env = await import("../../src/utils/env.js");
    env.setCurrentEnv(env.NET_ENV.Mainnet);

    const { getRpcEndpointCandidates } = await import("../../src/utils/rpcEndpoints.js");

    expect(getRpcEndpointCandidates()).toEqual([
      "/rpc/mainnet/primary",
      "/rpc/mainnet/fallback",
      "/rpc/mainnet/fallback2",
      "/rpc/mainnet/fallback3",
    ]);
  });

  it("calls runtime fallback endpoints in primary -> fallback -> fallback2 -> fallback3 order", async () => {
    const env = await import("../../src/utils/env.js");
    env.setCurrentEnv(env.NET_ENV.Mainnet);

    const { callWithRpcEndpointFallback } = await import("../../src/utils/rpcEndpoints.js");
    const visited = [];

    const result = await callWithRpcEndpointFallback(env.NET_ENV.Mainnet, async (endpoint) => {
      visited.push(endpoint);
      if (endpoint !== "/rpc/mainnet/fallback3") {
        throw new Error(`down:${endpoint}`);
      }
      return "ok";
    });

    expect(result).toBe("ok");
    expect(visited).toEqual([
      "/rpc/mainnet/primary",
      "/rpc/mainnet/fallback",
      "/rpc/mainnet/fallback2",
      "/rpc/mainnet/fallback3",
    ]);
  });

  it("reorders candidates to reuse the globally selected active endpoint first", async () => {
    const env = await import("../../src/utils/env.js");
    env.setCurrentEnv(env.NET_ENV.Mainnet);
    env.setActiveBasePath(env.NET_ENV.Mainnet, "/rpc/mainnet/fallback2");

    const { getRpcEndpointCandidates } = await import("../../src/utils/rpcEndpoints.js");

    expect(getRpcEndpointCandidates()).toEqual([
      "/rpc/mainnet/fallback2",
      "/rpc/mainnet/primary",
      "/rpc/mainnet/fallback",
      "/rpc/mainnet/fallback3",
    ]);
  });
});
