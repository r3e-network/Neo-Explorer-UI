import { beforeEach, describe, expect, it, vi } from "vitest";

describe("api configured base URL network routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("rewrites a configured mainnet RPC base URL to the testnet primary endpoint when the explorer is on testnet", async () => {
    vi.stubEnv("VITE_RPC_BASE_URL", "https://rpc-proxy.example.com/api/mainnet");

    const axiosMock = {
      create: vi.fn(),
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    };
    axiosMock.create.mockReturnValue(axiosMock);

    vi.doMock("axios", () => ({ default: axiosMock }));
    vi.doMock("../../src/utils/env.js", () => ({
      NET_ENV: {
        Mainnet: "Mainnet",
        TestT5: "TestT5",
      },
      getRpcApiBasePath: vi.fn(() => "/api/mainnet"),
      getCurrentEnv: vi.fn(() => "TestT5"),
      setActiveBasePath: vi.fn(),
    }));
    vi.doMock("../../src/utils/healthCheck.js", () => ({
      checkAndSetEndpoints: vi.fn(() => Promise.resolve()),
    }));

    axiosMock.post.mockImplementation((_url, payload, config) => {
      if (payload?.method === "getversion") {
        return Promise.resolve({ data: { result: { protocol: { network: 894710606 } } } });
      }

      if (payload?.method === "GetContractByContractHash") {
        return Promise.resolve({ data: { result: { hash: payload.params.ContractHash } } });
      }

      throw new Error(`Unexpected RPC call: ${payload?.method} @ ${config?.baseURL}`);
    });

    const { __resetEndpointNetworkCacheForTests, safeRpc } = await import("../../src/services/api.js");
    __resetEndpointNetworkCacheForTests();

    const hash = "0x1234567890abcdef1234567890abcdef12345678";
    const result = await safeRpc("GetContractByContractHash", { ContractHash: hash }, null);

    expect(result).toEqual({ hash });
    expect(axiosMock.post).toHaveBeenNthCalledWith(
      1,
      "",
      expect.objectContaining({ method: "getversion" }),
      expect.objectContaining({ baseURL: "https://rpc-proxy.example.com/api/testnet/primary" })
    );
    expect(axiosMock.post).toHaveBeenNthCalledWith(
      2,
      "",
      expect.objectContaining({ method: "GetContractByContractHash", params: { ContractHash: hash } }),
      expect.objectContaining({ baseURL: "https://rpc-proxy.example.com/api/testnet/primary" })
    );
  });

  it("fails over from a configured mainnet primary URL to the matching testnet fallback URL", async () => {
    vi.stubEnv("VITE_RPC_BASE_URL", "https://rpc-proxy.example.com/api/mainnet/primary");

    const axiosMock = {
      create: vi.fn(),
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    };
    axiosMock.create.mockReturnValue(axiosMock);

    vi.doMock("axios", () => ({ default: axiosMock }));
    vi.doMock("../../src/utils/env.js", () => ({
      NET_ENV: {
        Mainnet: "Mainnet",
        TestT5: "TestT5",
      },
      getRpcApiBasePath: vi.fn(() => "/api/mainnet"),
      getCurrentEnv: vi.fn(() => "TestT5"),
      setActiveBasePath: vi.fn(),
    }));
    vi.doMock("../../src/utils/healthCheck.js", () => ({
      checkAndSetEndpoints: vi.fn(() => Promise.resolve()),
    }));

    const timeoutError = Object.assign(new Error("timeout of 5000ms exceeded"), {
      code: "ECONNABORTED",
    });

    axiosMock.post.mockImplementation((_url, payload, config) => {
      const method = payload?.method;
      const baseURL = config?.baseURL;

      if (method === "getversion" && baseURL === "https://rpc-proxy.example.com/api/testnet/primary") {
        return Promise.resolve({ data: { result: { protocol: { network: 894710606 } } } });
      }

      if (method === "GetBlockCount" && baseURL === "https://rpc-proxy.example.com/api/testnet/primary") {
        return Promise.reject(timeoutError);
      }

      if (method === "getversion" && baseURL === "https://rpc-proxy.example.com/api/testnet/fallback") {
        return Promise.resolve({ data: { result: { protocol: { network: 894710606 } } } });
      }

      if (method === "GetBlockCount" && baseURL === "https://rpc-proxy.example.com/api/testnet/fallback") {
        return Promise.resolve({ data: { result: { count: 22 } } });
      }

      throw new Error(`Unexpected RPC call: ${method} @ ${baseURL}`);
    });

    const { __resetEndpointNetworkCacheForTests, safeRpc } = await import("../../src/services/api.js");
    __resetEndpointNetworkCacheForTests();

    const result = await safeRpc("GetBlockCount", {}, null);

    expect(result).toEqual({ count: 22 });
    expect(axiosMock.post).toHaveBeenNthCalledWith(
      1,
      "",
      expect.objectContaining({ method: "getversion" }),
      expect.objectContaining({ baseURL: "https://rpc-proxy.example.com/api/testnet/primary" })
    );
    expect(axiosMock.post).toHaveBeenNthCalledWith(
      2,
      "",
      expect.objectContaining({ method: "GetBlockCount" }),
      expect.objectContaining({ baseURL: "https://rpc-proxy.example.com/api/testnet/primary" })
    );
    expect(axiosMock.post).toHaveBeenNthCalledWith(
      3,
      "",
      expect.objectContaining({ method: "GetBlockCount" }),
      expect.objectContaining({ baseURL: "https://rpc-proxy.example.com/api/testnet/fallback" })
    );
  });

});
