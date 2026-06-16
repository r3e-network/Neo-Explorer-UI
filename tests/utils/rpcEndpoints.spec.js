import { beforeEach, describe, expect, it, vi } from "vitest";

describe("rpcEndpoints configured base URL", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
    window.localStorage.clear();
  });

  it("uses testnet primary candidate for a configured mainnet network-aware base URL", async () => {
    vi.stubEnv("VITE_RPC_BASE_URL", "https://rpc-proxy.example.com/api/mainnet");

    const env = await import("../../src/utils/env.js");
    env.setCurrentEnv(env.NET_ENV.TestT5);

    const { getRpcEndpointCandidates } = await import("../../src/utils/rpcEndpoints.js");

    expect(getRpcEndpointCandidates()).toEqual([
      "https://rpc-proxy.example.com/api/testnet/primary",
    ]);
  });

  it("defaults to direct-node primary plus worker fallback proxy routes", async () => {
    const env = await import("../../src/utils/env.js");
    env.setCurrentEnv(env.NET_ENV.Mainnet);

    const { getRpcEndpointCandidates } = await import("../../src/utils/rpcEndpoints.js");

    // neon-js's RpcDispatcher rejects relative URLs, so candidates are
    // resolved against window.location.origin.
    expect(getRpcEndpointCandidates()).toEqual([
      `${window.location.origin}/rpc/mainnet/primary`,
      `${window.location.origin}/rpc/mainnet/fallback`,
    ]);
  });

  it("calls runtime endpoint with primary first", async () => {
    const env = await import("../../src/utils/env.js");
    env.setCurrentEnv(env.NET_ENV.Mainnet);

    const { callWithRpcEndpointFallback } = await import("../../src/utils/rpcEndpoints.js");
    const visited = [];

    const result = await callWithRpcEndpointFallback(env.NET_ENV.Mainnet, async (endpoint) => {
      visited.push(endpoint);
      return "ok";
    });

    expect(result).toBe("ok");
    expect(visited).toEqual([
      `${window.location.origin}/rpc/mainnet/primary`,
    ]);
  });

  it("throws when the single primary endpoint fails", async () => {
    const env = await import("../../src/utils/env.js");
    env.setCurrentEnv(env.NET_ENV.Mainnet);

    const { callWithRpcEndpointFallback } = await import("../../src/utils/rpcEndpoints.js");

    await expect(
      callWithRpcEndpointFallback(env.NET_ENV.Mainnet, async () => {
        throw new Error("primary down");
      })
    ).rejects.toThrow("primary down");
  });

  it("skips a candidate when getversion reports the wrong network", async () => {
    const env = await import("../../src/utils/env.js");
    env.setCurrentEnv(env.NET_ENV.TestT5);

    vi.stubGlobal("fetch", vi.fn(async (input) => {
      const endpoint = String(input instanceof Request ? input.url : input);
      const network = endpoint.includes("/fallback") ? 894710606 : 860833102;
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: { protocol: { network } },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }));

    const { callWithRpcEndpointFallback } = await import("../../src/utils/rpcEndpoints.js");
    const visited = [];

    const result = await callWithRpcEndpointFallback(env.NET_ENV.TestT5, async (endpoint) => {
      visited.push(endpoint);
      return "testnet-ok";
    });

    expect(result).toBe("testnet-ok");
    expect(visited).toEqual([
      `${window.location.origin}/rpc/testnet/fallback`,
    ]);
  });

  it("returns only primary even when active base path is set", async () => {
    const env = await import("../../src/utils/env.js");
    env.setCurrentEnv(env.NET_ENV.Mainnet);
    env.setActiveBasePath(env.NET_ENV.Mainnet, "/rpc/mainnet/primary");

    const { getRpcEndpointCandidates } = await import("../../src/utils/rpcEndpoints.js");

    expect(getRpcEndpointCandidates()).toEqual([
      `${window.location.origin}/rpc/mainnet/primary`,
      `${window.location.origin}/rpc/mainnet/fallback`,
    ]);
  });
});
