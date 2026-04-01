import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  const state = { currentBasePath: "/rpc/mainnet" };
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
  getActiveBasePath: vi.fn(() => envState.currentBasePath),
  getCurrentEnv: vi.fn(() => "Mainnet"),
  getConfiguredRpcBaseUrl: vi.fn(() => ""),
  setActiveBasePath: setActiveBasePathMock,
  toAbsoluteUrl: vi.fn((value) => value),
}));

vi.mock("../../src/utils/healthCheck.js", () => ({
  checkAndSetEndpoints: vi.fn(() => Promise.resolve()),
}));

const responseErrorHandler = axios.interceptors.response.use.mock.calls[0]?.[1];

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

let consoleErrorSpy;
let consoleWarnSpy;

describe("safeRpc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envState.currentBasePath = "/rpc/mainnet";
    __resetEndpointNetworkCacheForTests();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
    consoleWarnSpy?.mockRestore();
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
    expect(consoleErrorSpy).not.toHaveBeenCalled();
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

  it("normalizes previousblockhash to prevhash for block detail payloads", async () => {
    axios.post.mockResolvedValueOnce({
      data: { result: { protocol: { network: 860833102 } } },
    });
    axios.post.mockResolvedValueOnce({
      data: {
        result: {
          hash: "0xabc",
          previousblockhash: "0xprev",
        },
      },
    });

    const result = await safeRpc("GetBlockInfoByBlockHash", { BlockHash: "0xabc" });
    expect(result).toEqual({
      hash: "0xabc",
      previousblockhash: "0xprev",
      prevhash: "0xprev",
    });
  });

  // Removed: "fails over to fallback endpoint" — fallback endpoints removed in single-server architecture.
  // Removed: "continues beyond the first fallback" — fallback chain removed in single-server architecture.

  it("retries the rest of the pool when the globally selected fallback2 endpoint fails", async () => {
    envState.currentBasePath = "/rpc/mainnet/fallback2";

    const timeoutError = Object.assign(new Error("timeout of 8000ms exceeded"), {
      code: "ECONNABORTED",
    });

    axios.post.mockImplementation((_url, payload, config) => {
      const method = payload?.method;
      const baseURL = config?.baseURL;

      if (method === "getversion" && (baseURL === "/rpc/mainnet/fallback2" || baseURL === "/rpc/mainnet/primary")) {
        return Promise.resolve({ data: { result: { protocol: { network: 860833102 } } } });
      }

      if (method === "GetBlockCount" && baseURL === "/rpc/mainnet/fallback2") {
        return Promise.reject(timeoutError);
      }

      if (method === "GetBlockCount" && baseURL === "/rpc/mainnet/primary") {
        return Promise.resolve({ data: { result: { index: 654 } } });
      }

      throw new Error(`Unexpected RPC call: ${method} @ ${baseURL}`);
    });

    const result = await safeRpc("GetBlockCount", {});

    expect(result).toEqual({ index: 654 });
    expect(axios.post).toHaveBeenCalledWith(
      "",
      expect.objectContaining({ method: "GetBlockCount" }),
      expect.objectContaining({ baseURL: "/rpc/mainnet/primary" })
    );
  });

  // Removed: "switches base path to fallback" — fallback endpoints removed in single-server architecture.
  // Removed: "starts a hedged fallback request" — hedge disabled in single-server architecture.
  // Removed: "keeps hedged fallback enabled after long uptime" — hedge disabled in single-server architecture.
  // Removed: "fails over when the primary endpoint reports the wrong network magic" — single endpoint, no failover.
  // Removed: "prefers the fallback endpoint first for indexed by-hash explorer APIs" — single endpoint, no fallback preference.
});

describe("rpc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envState.currentBasePath = "/rpc/mainnet";
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

describe("api response interceptor logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });

  it("suppresses dev error logging for internal requests flagged as silent", async () => {
    const error = { message: "timeout of 350ms exceeded", config: { __suppressDevErrorLog: true } };

    await expect(responseErrorHandler(error)).rejects.toBe(error);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("logs dev errors for non-suppressed requests", async () => {
    const error = { message: "Network error", config: {} };

    await expect(responseErrorHandler(error)).rejects.toBe(error);
    expect(consoleErrorSpy).toHaveBeenCalledWith("API Error:", "Network error");
  });
});
