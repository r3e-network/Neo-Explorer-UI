import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const rpcEndpoints = require("../../api/lib/rpcEndpoints.js");

describe("api/lib/rpcEndpoints defaults", () => {
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
});
