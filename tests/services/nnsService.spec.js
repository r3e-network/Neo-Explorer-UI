import { beforeEach, describe, expect, it, vi } from "vitest";

const safeRpc = vi.fn();
const rpc = vi.fn();
const axiosPost = vi.fn();
const getCacheKey = vi.fn(() => "nns-cache-key");
const cachedRequest = vi.fn((_key, fetchFn) => fetchFn());

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
});
