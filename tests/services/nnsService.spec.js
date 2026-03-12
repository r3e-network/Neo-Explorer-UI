import { beforeEach, describe, expect, it, vi } from "vitest";

const safeRpc = vi.fn();
const rpc = vi.fn();
const axiosPost = vi.fn();
const getCacheKey = vi.fn(() => "nns-cache-key");
const cachedRequest = vi.fn((_key, fetchFn) => fetchFn());
const getAddressTag = vi.fn();
const getScriptHashFromAddress = vi.fn();

let currentEnv = "Mainnet";
let currentBasePath = "/api/mainnet/fallback";

vi.mock("../../src/services/api.js", () => ({
  safeRpc,
  rpc,
}));

vi.mock("axios", () => ({
  default: {
    post: axiosPost,
  },
}));

vi.mock("../../src/services/cache.js", () => ({
  CACHE_TTL: { chart: 5 * 60 * 1000 },
  getCacheKey,
  cachedRequest,
}));

vi.mock("../../src/services/supabaseService.js", () => ({
  supabaseService: {
    getAddressTag,
  },
}));

vi.mock("@cityofzion/neon-js", () => ({
  rpc: {},
  sc: {
    ContractParam: {
      string: vi.fn(),
      integer: vi.fn(),
    },
  },
  wallet: {
    getScriptHashFromAddress,
  },
}));

vi.mock("../../src/utils/env.js", () => ({
  NET_ENV: {
    Mainnet: "Mainnet",
    TestT5: "TestT5",
  },
  getCurrentEnv: () => currentEnv,
  getRpcApiBasePath: () => currentBasePath,
}));

describe("nnsService.resolveDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    currentEnv = "Mainnet";
    currentBasePath = "/api/mainnet/fallback";
  });

  it("retries using mainnet primary when fallback endpoint rejects GetNNSResolve", async () => {
    const domain = "flamingo.neo";
    const expectedAddress = "NNf8jxEBxsahLSiYtuHWsMFn93THdTFryw";

    rpc.mockRejectedValueOnce(new Error("RPC Error -32600: Invalid request"));
    axiosPost.mockResolvedValueOnce({
      data: {
        result: {
          address: expectedAddress,
        },
      },
    });

    const { default: nnsService } = await import("../../src/services/nnsService.js");
    const resolved = await nnsService.resolveDomain(domain);

    expect(rpc).toHaveBeenCalledWith("GetNNSResolve", { Domain: domain });
    expect(axiosPost).toHaveBeenCalledWith(
      "/api/mainnet/primary",
      {
        jsonrpc: "2.0",
        id: 1,
        method: "GetNNSResolve",
        params: { Domain: domain },
      },
      { timeout: 8000 }
    );
    expect(resolved).toBe(expectedAddress);
  });

  it("retries using configured mainnet primary when an external fallback endpoint rejects GetNNSResolve", async () => {
    const domain = "flamingo.neo";
    const expectedAddress = "NNf8jxEBxsahLSiYtuHWsMFn93THdTFryw";

    currentBasePath = "https://rpc-proxy.example.com/api/mainnet/fallback";
    rpc.mockRejectedValueOnce(new Error("RPC Error -32600: Invalid request"));
    axiosPost.mockResolvedValueOnce({
      data: {
        result: {
          address: expectedAddress,
        },
      },
    });

    const { default: nnsService } = await import("../../src/services/nnsService.js");
    const resolved = await nnsService.resolveDomain(domain);

    expect(axiosPost).toHaveBeenCalledWith(
      "https://rpc-proxy.example.com/api/mainnet/primary",
      {
        jsonrpc: "2.0",
        id: 1,
        method: "GetNNSResolve",
        params: { Domain: domain },
      },
      { timeout: 8000 }
    );
    expect(resolved).toBe(expectedAddress);
  });


  it("resolves .matrix aliases on testnet via owned NEP-11 tokens", async () => {
    currentEnv = "TestT5";
    getAddressTag.mockResolvedValueOnce(null);
    getScriptHashFromAddress.mockReturnValueOnce("0xabc123");

    safeRpc.mockImplementation(async (method) => {
      if (method === "GetNep11TransferByAddress") {
        return {
          result: [
            {
              contract: "0x89908093c5ccc463e2c5744d6bacb06108b60a75",
              tokenId: "YWxpY2UubWF0cml4",
              to: "0xabc123",
              from: null,
            },
          ],
        };
      }
      return [];
    });

    const { default: nnsService } = await import("../../src/services/nnsService.js");
    const resolved = await nnsService.resolveAddressToNNS("NTestAddress123");

    expect(safeRpc).toHaveBeenCalledWith(
      "GetNep11TransferByAddress",
      { Address: "0xabc123", Limit: 100 },
      null
    );
    expect(resolved).toEqual({ nns: "alice.matrix" });
  });

  it("resolves hash160 targets via admin lookup when owner lookup is empty", async () => {
    currentEnv = "Mainnet";
    getAddressTag.mockResolvedValueOnce(null);
    const targetHash = "0x1111111111111111111111111111111111111111";

    safeRpc.mockImplementation(async (method) => {
      if (method === "GetNNSNameByOwner") return [];
      if (method === "GetNNSNameByAdmin") {
        return [
          {
            name: "oracle.morpheus.neo",
            expiration: Date.now() + 60_000,
          },
        ];
      }
      return [];
    });

    const { default: nnsService } = await import("../../src/services/nnsService.js");
    const resolved = await nnsService.resolveAddressToNNS(targetHash);

    expect(safeRpc).toHaveBeenNthCalledWith(
      1,
      "GetNNSNameByOwner",
      {
        Asset: "0x50ac1c37690cc2cfc594472833cf57505d5f46de",
        Owner: targetHash,
      },
      []
    );
    expect(safeRpc).toHaveBeenNthCalledWith(
      2,
      "GetNNSNameByAdmin",
      {
        Asset: "0x50ac1c37690cc2cfc594472833cf57505d5f46de",
        Admin: targetHash,
      },
      []
    );
    expect(resolved).toEqual({ nns: "oracle.morpheus.neo" });
  });

});
