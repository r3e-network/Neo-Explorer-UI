import { createRequire } from "node:module";
import { beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const rpcEndpoints = require("../../api/lib/rpcEndpoints.js");

describe("api/lib/rpcEndpoints defaults", () => {
  beforeEach(() => {
    rpcEndpoints.__resetPreferredRpcEndpointsForTests();
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", vi.fn(async (input) => {
      const endpoint = String(input instanceof Request ? input.url : input);
      const network = endpoint.includes("testnet") || endpoint.includes("testnet1.neo.coz.io")
        ? 894710606
        : 860833102;
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: { protocol: { network } },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }));
  });

  it("uses direct neo-go primary with the worker as fallback", () => {
    expect(rpcEndpoints.getRpcEndpointCandidates("mainnet")).toEqual([
      "https://rpc.n3index.dev/mainnet",
      "https://api.n3index.dev/mainnet",
    ]);

    expect(rpcEndpoints.getRpcEndpointCandidates("testnet")).toEqual([
      "https://testnet1.neo.coz.io",
      "https://api.n3index.dev/testnet",
    ]);
  });

  it("falls through to the worker when direct neo-go fails", async () => {
    const visited = [];
    const result = await rpcEndpoints.callWithRpcEndpointFallback("mainnet", async (endpoint) => {
      visited.push(endpoint);
      if (endpoint !== "https://api.n3index.dev/mainnet") {
        throw new Error(`down:${endpoint}`);
      }
      return "ok";
    });

    expect(result).toBe("ok");
    expect(visited).toEqual([
      "https://rpc.n3index.dev/mainnet",
      "https://api.n3index.dev/mainnet",
    ]);
  });

  it("reuses the last successful endpoint first on subsequent calls", async () => {
    const firstVisited = [];
    const firstResult = await rpcEndpoints.callWithRpcEndpointFallback("mainnet", async (endpoint) => {
      firstVisited.push(endpoint);
      if (endpoint !== "https://api.n3index.dev/mainnet") {
        throw new Error(`down:${endpoint}`);
      }
      return "ok-first";
    });

    expect(firstResult).toBe("ok-first");
    expect(firstVisited).toEqual([
      "https://rpc.n3index.dev/mainnet",
      "https://api.n3index.dev/mainnet",
    ]);

    const secondVisited = [];
    const secondResult = await rpcEndpoints.callWithRpcEndpointFallback("mainnet", async (endpoint) => {
      secondVisited.push(endpoint);
      return "ok-second";
    });

    expect(secondResult).toBe("ok-second");
    expect(secondVisited).toEqual(["https://api.n3index.dev/mainnet"]);
  });

  it("skips a candidate when getversion reports the wrong network", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input) => {
      const endpoint = String(input instanceof Request ? input.url : input);
      const network = endpoint.includes("api.n3index.dev") ? 894710606 : 860833102;
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: { protocol: { network } },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }));

    const visited = [];
    const result = await rpcEndpoints.callWithRpcEndpointFallback("testnet", async (endpoint) => {
      visited.push(endpoint);
      return "testnet-ok";
    });

    expect(result).toBe("testnet-ok");
    expect(visited).toEqual(["https://api.n3index.dev/testnet"]);
  });
});
