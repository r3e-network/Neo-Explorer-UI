import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import {
  __resetEndpointNetworkCacheForTests,
  formatListResponse,
  rpc,
  safeRpc,
} from "../../src/services/api.js";

// Mock axios
vi.mock("axios", () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return { default: mockAxios };
});

const { envState, setActiveBasePathMock } = vi.hoisted(() => {
  const state = { currentBasePath: "/api/mainnet" };
  return {
    envState: state,
    setActiveBasePathMock: vi.fn((_env, path) => {
      state.currentBasePath = path;
    }),
  };
});

vi.mock("../../src/utils/env.js", () => ({
  NET_ENV: {
    Mainnet: "Mainnet",
    TestT5: "TestT5",
  },
  getRpcApiBasePath: vi.fn(() => envState.currentBasePath),
  getCurrentEnv: vi.fn(() => "Mainnet"),
  setActiveBasePath: setActiveBasePathMock,
}));

vi.mock("../../src/utils/healthCheck.js", () => ({
  checkAndSetEndpoints: vi.fn(() => Promise.resolve()),
}));

describe("formatListResponse", () => {
  it("returns empty result for null input", () => {
    const result = formatListResponse(null);
    expect(result).toEqual({ result: [], totalCount: 0 });
  });

  it("returns empty result for undefined input", () => {
    const result = formatListResponse(undefined);
    expect(result).toEqual({ result: [], totalCount: 0 });
  });

  it("handles array response", () => {
    const input = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = formatListResponse(input);
    expect(result).toEqual({ result: input, totalCount: 3 });
  });

  it("handles empty array", () => {
    const result = formatListResponse([]);
    expect(result).toEqual({ result: [], totalCount: 0 });
  });

  it("handles object with result and totalCount", () => {
    const input = {
      result: [{ id: 1 }, { id: 2 }],
      totalCount: 100,
    };
    const result = formatListResponse(input);
    expect(result).toEqual({ result: input.result, totalCount: 100 });
  });

  it("handles object with result but no totalCount", () => {
    const input = { result: [{ id: 1 }] };
    const result = formatListResponse(input);
    expect(result).toEqual({ result: [{ id: 1 }], totalCount: 0 });
  });

  it("handles object with non-array result", () => {
    const input = { result: "invalid", totalCount: 5 };
    const result = formatListResponse(input);
    expect(result).toEqual({ result: [], totalCount: 5 });
  });

  it("returns empty for object without result property", () => {
    const input = { data: [1, 2, 3], count: 3 };
    const result = formatListResponse(input);
    expect(result).toEqual({ result: [], totalCount: 0 });
  });
});

describe("safeRpc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envState.currentBasePath = "/api/mainnet";
    __resetEndpointNetworkCacheForTests();
  });

  it("returns result on success", async () => {
    axios.post.mockResolvedValueOnce({
      data: { result: { protocol: { network: 860833102 } } },
    });
    axios.post.mockResolvedValueOnce({
      data: { result: { blockHeight: 12345 } },
    });

    const result = await safeRpc("GetBlockCount", {});
    expect(result).toEqual({ blockHeight: 12345 });
  });

  it("returns default value on error", async () => {
    axios.post.mockRejectedValue(new Error("Network error"));

    const result = await safeRpc("GetBlockCount", {}, { blockHeight: 0 });
    expect(result).toEqual({ blockHeight: 0 });
  });

  it("returns null as default when not specified", async () => {
    axios.post.mockRejectedValue(new Error("Network error"));

    const result = await safeRpc("GetBlockCount", {});
    expect(result).toBeNull();
  });

  it("returns default value when result is null", async () => {
    axios.post.mockResolvedValueOnce({
      data: { result: { protocol: { network: 860833102 } } },
    });
    axios.post.mockResolvedValueOnce({ data: { result: null } });

    const result = await safeRpc("GetBlockCount", {}, []);
    expect(result).toEqual([]);
  });

  it("normalizes block transactioncount alias", async () => {
    axios.post.mockResolvedValueOnce({
      data: { result: { protocol: { network: 860833102 } } },
    });
    axios.post.mockResolvedValueOnce({
      data: { result: { hash: "0xabc", transactioncount: 1 } },
    });

    const result = await safeRpc("GetBlockInfoByBlockHash", { BlockHash: "0xabc" });
    expect(result).toEqual({ hash: "0xabc", transactioncount: 1, txcount: 1 });
  });

  it("fails over to fallback endpoint when primary startup endpoint times out", async () => {
    const timeoutError = Object.assign(new Error("timeout of 8000ms exceeded"), {
      code: "ECONNABORTED",
    });

    axios.post.mockImplementation((_url, payload, config) => {
      const method = payload?.method;
      const baseURL = config?.baseURL;

      if (method === "getversion" && baseURL === "/api/mainnet/primary") {
        return Promise.resolve({ data: { result: { protocol: { network: 860833102 } } } });
      }
      if (method === "GetBlockCount" && baseURL === "/api/mainnet/primary") {
        return Promise.reject(timeoutError);
      }
      if (method === "getversion" && baseURL === "/api/mainnet/fallback") {
        return Promise.resolve({ data: { result: { protocol: { network: 860833102 } } } });
      }
      if (method === "GetBlockCount" && baseURL === "/api/mainnet/fallback") {
        return Promise.resolve({ data: { result: { index: 123 } } });
      }

      throw new Error(`Unexpected RPC call: ${method} @ ${baseURL}`);
    });

    const result = await safeRpc("GetBlockCount", {});
    expect(result).toEqual({ index: 123 });

    expect(axios.post).toHaveBeenNthCalledWith(
      1,
      "",
      expect.objectContaining({ method: "getversion" }),
      expect.objectContaining({ baseURL: "/api/mainnet/primary" })
    );
    expect(axios.post).toHaveBeenNthCalledWith(
      2,
      "",
      expect.objectContaining({ method: "GetBlockCount" }),
      expect.objectContaining({ baseURL: "/api/mainnet/primary" })
    );
    expect(axios.post).toHaveBeenNthCalledWith(
      3,
      "",
      expect.objectContaining({ method: "GetBlockCount" }),
      expect.objectContaining({ baseURL: "/api/mainnet/fallback" })
    );
  });

  it("switches base path to fallback after a transient primary failover", async () => {
    const timeoutError = Object.assign(new Error("timeout of 8000ms exceeded"), {
      code: "ECONNABORTED",
    });

    let primaryCallCount = 0;
    axios.post.mockImplementation((_url, payload, config) => {
      const method = payload?.method;
      const baseURL = config?.baseURL;

      if (method === "getversion") {
        return Promise.resolve({ data: { result: { protocol: { network: 860833102 } } } });
      }

      if (method === "GetBlockCount" && baseURL === "/api/mainnet/primary") {
        primaryCallCount += 1;
        if (primaryCallCount === 1) return Promise.reject(timeoutError);
        return Promise.resolve({ data: { result: { count: 11 } } });
      }

      if (method === "GetBlockCount" && baseURL === "/api/mainnet/fallback") {
        return Promise.resolve({ data: { result: { count: 10 } } });
      }

      throw new Error(`Unexpected RPC call: ${method} @ ${baseURL}`);
    });

    await safeRpc("GetBlockCount", {});
    await safeRpc("GetBlockCount", {});

    expect(setActiveBasePathMock).toHaveBeenCalledWith("Mainnet", "/api/mainnet/fallback");
    expect(axios.post).toHaveBeenLastCalledWith(
      "",
      expect.objectContaining({ method: "GetBlockCount" }),
      expect.objectContaining({ baseURL: "/api/mainnet/fallback" })
    );
  });

  it("starts a hedged fallback request when primary is hanging to avoid long stalls", async () => {
    vi.useFakeTimers();
    try {
      axios.post
        .mockResolvedValueOnce({ data: { result: { protocol: { network: 860833102 } } } })
        .mockImplementationOnce(() => new Promise(() => {}))
        .mockResolvedValueOnce({ data: { result: { index: 98765 } } });

      const request = safeRpc("GetBlockCount", {});
      await vi.advanceTimersByTimeAsync(1200);

      await expect(request).resolves.toEqual({ index: 98765 });
      expect(axios.post).toHaveBeenNthCalledWith(
        1,
        "",
        expect.objectContaining({ method: "getversion" }),
        expect.objectContaining({ baseURL: "/api/mainnet/primary" })
      );
      expect(axios.post).toHaveBeenNthCalledWith(
        2,
        "",
        expect.objectContaining({ method: "GetBlockCount" }),
        expect.objectContaining({ baseURL: "/api/mainnet/primary" })
      );
      expect(axios.post).toHaveBeenNthCalledWith(
        3,
        "",
        expect.objectContaining({ method: "GetBlockCount" }),
        expect.objectContaining({ baseURL: "/api/mainnet/fallback" })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps hedged fallback enabled after long uptime to avoid 12s stalls", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(Date.now() + 120_000);

      axios.post
        .mockResolvedValueOnce({ data: { result: { protocol: { network: 860833102 } } } })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve({ data: { result: { index: 101 } } }), 5000);
            })
        )
        .mockResolvedValueOnce({ data: { result: { index: 202 } } });

      const request = safeRpc("GetBlockCount", {});

      await vi.advanceTimersByTimeAsync(1200);

      expect(axios.post).toHaveBeenCalledTimes(3);
      await expect(request).resolves.toEqual({ index: 202 });
    } finally {
      vi.useRealTimers();
    }
  });

  it("fails over when the primary endpoint reports the wrong network magic", async () => {
    axios.post.mockImplementation((_url, payload, config) => {
      const method = payload?.method;
      const baseURL = config?.baseURL;

      if (method === "getversion" && baseURL === "/api/mainnet/primary") {
        return Promise.resolve({
          data: { result: { protocol: { network: 894710606 } } },
        });
      }

      if (method === "getversion" && baseURL === "/api/mainnet/fallback") {
        return Promise.resolve({
          data: { result: { protocol: { network: 860833102 } } },
        });
      }

      if (method === "GetBlockCount" && baseURL === "/api/mainnet/fallback") {
        return Promise.resolve({ data: { result: { index: 321 } } });
      }

      if (method === "GetBlockCount" && baseURL === "/api/mainnet/primary") {
        return Promise.resolve({ data: { result: { index: 999 } } });
      }

      throw new Error(`Unexpected RPC call: ${method} @ ${baseURL}`);
    });

    const result = await safeRpc("GetBlockCount", {});
    expect(result).toEqual({ index: 321 });
    expect(setActiveBasePathMock).toHaveBeenCalledWith("Mainnet", "/api/mainnet/fallback");
  });
});

describe("rpc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envState.currentBasePath = "/api/mainnet";
    __resetEndpointNetworkCacheForTests();
  });

  it("uses [] as default params for zero-argument RPC methods", async () => {
    axios.post.mockResolvedValueOnce({
      data: { result: { protocol: { network: 860833102 } } },
    });
    axios.post.mockResolvedValueOnce({
      data: { result: [{ publickey: "PUBKEY1" }] },
    });

    const result = await rpc("getnextblockvalidators");
    expect(result).toEqual([{ publickey: "PUBKEY1" }]);

    expect(axios.post).toHaveBeenCalledWith(
      "",
      expect.objectContaining({ method: "getnextblockvalidators", params: [] }),
      expect.any(Object)
    );
  });
});
