import { createRequire } from "node:module";
import { beforeEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const rpcEndpoints = require("../../api/lib/rpcEndpoints.js");

describe("api/lib/rpcEndpoints defaults", () => {
  beforeEach(() => {
    rpcEndpoints.__resetPreferredRpcEndpointsForTests();
  });

  it("uses api.n3index.dev primary with api1/api2/api3 backups", () => {
    expect(rpcEndpoints.getRpcEndpointCandidates("mainnet")).toEqual([
      "https://api.n3index.dev/mainnet",
      "https://api1.n3index.dev/mainnet",
      "https://api2.n3index.dev/mainnet",
      "https://api3.n3index.dev/mainnet",
    ]);

    expect(rpcEndpoints.getRpcEndpointCandidates("testnet")).toEqual([
      "https://api.n3index.dev/testnet",
      "https://api1.n3index.dev/testnet",
      "https://api2.n3index.dev/testnet",
      "https://api3.n3index.dev/testnet",
    ]);
  });

  it("falls through api1 then api2 then api3 when earlier endpoints fail", async () => {
    const visited = [];
    const result = await rpcEndpoints.callWithRpcEndpointFallback("mainnet", async (endpoint) => {
      visited.push(endpoint);
      if (endpoint !== "https://api3.n3index.dev/mainnet") {
        throw new Error(`down:${endpoint}`);
      }
      return "ok";
    });

    expect(result).toBe("ok");
    expect(visited).toEqual([
      "https://api.n3index.dev/mainnet",
      "https://api1.n3index.dev/mainnet",
      "https://api2.n3index.dev/mainnet",
      "https://api3.n3index.dev/mainnet",
    ]);
  });

  it("reuses the last successful endpoint first on subsequent calls", async () => {
    const firstVisited = [];
    const firstResult = await rpcEndpoints.callWithRpcEndpointFallback("mainnet", async (endpoint) => {
      firstVisited.push(endpoint);
      if (endpoint !== "https://api2.n3index.dev/mainnet") {
        throw new Error(`down:${endpoint}`);
      }
      return "ok-first";
    });

    expect(firstResult).toBe("ok-first");
    expect(firstVisited).toEqual([
      "https://api.n3index.dev/mainnet",
      "https://api1.n3index.dev/mainnet",
      "https://api2.n3index.dev/mainnet",
    ]);

    const secondVisited = [];
    const secondResult = await rpcEndpoints.callWithRpcEndpointFallback("mainnet", async (endpoint) => {
      secondVisited.push(endpoint);
      return "ok-second";
    });

    expect(secondResult).toBe("ok-second");
    expect(secondVisited).toEqual(["https://api2.n3index.dev/mainnet"]);
  });
});
