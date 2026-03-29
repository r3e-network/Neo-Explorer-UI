import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
const setActiveBasePath = vi.fn();
const getCurrentEnv = vi.fn(() => "Mainnet");
const getActiveBasePath = vi.fn((env) =>
  env === "TestT5" ? "/rpc/testnet" : "/rpc/mainnet"
);
const getConfiguredRpcBaseUrl = vi.fn(() => "");
const toAbsoluteUrl = vi.fn((value) => value);

vi.mock("axios", () => ({
  default: {
    post,
  },
}));

vi.mock("../../src/utils/env", () => ({
  NET_ENV: {
    Mainnet: "Mainnet",
    TestT5: "TestT5",
  },
  getCurrentEnv,
  getActiveBasePath,
  setActiveBasePath,
  getConfiguredRpcBaseUrl,
  toAbsoluteUrl,
}));

let consoleInfoSpy;
let consoleWarnSpy;

describe("healthCheck endpoint selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleInfoSpy?.mockRestore();
    consoleWarnSpy?.mockRestore();
  });

  // Removed: "selects fallback when primary endpoint fails" — single-server, no fallback endpoints.
  // Removed: "prefers fallback when both are healthy but fallback is much faster" — single-server, no fallback.
  // Removed: "rejects endpoints with wrong network magic and picks the endpoint matching the selected network" — single endpoint.
  // Removed: "does not log an endpoint switch when the selected endpoint is unchanged" — single endpoint.
  // Removed: "promotes a deeper backup endpoint" — single endpoint, no deeper backups.

  it("keeps current route when all local candidates are wrong-network", async () => {
    post.mockImplementation(async (url, payload) => {
      const method = payload?.method;
      if (url.includes("/rpc/mainnet/") && method === "getversion") {
        return { data: { result: { protocol: { network: 894710606 } } } };
      }
      if (url.includes("/rpc/mainnet/") && method === "GetBlockCount") {
        return { data: { result: { index: 100 } } };
      }
      throw new Error(`unexpected call: ${url} ${method}`);
    });

    const { checkAndSetEndpoints } = await import("../../src/utils/healthCheck.js");
    await checkAndSetEndpoints("Mainnet");

    expect(setActiveBasePath).not.toHaveBeenCalled();
  });

  it("treats slower but healthy probes as valid when the default timeout budget covers them", async () => {
    getActiveBasePath.mockImplementation((env) =>
      env === "Mainnet" ? "/rpc/mainnet/primary" : "/rpc/testnet/primary"
    );

    post.mockImplementation(async (_url, payload, config) => {
      const requiredTimeoutMs = payload?.method === "getversion" ? 3000 : 3500;
      if ((config?.timeout || 0) < requiredTimeoutMs) {
        throw new Error(`timeout of ${config?.timeout}ms exceeded`);
      }

      if (payload?.method === "getversion") {
        return { data: { result: { protocol: { network: 860833102 } } } };
      }

      return { data: { result: { index: 500 } } };
    });

    const { checkAndSetEndpoints } = await import("../../src/utils/healthCheck.js");
    await checkAndSetEndpoints("Mainnet");

    expect(setActiveBasePath).not.toHaveBeenCalled();
  });

  it("keeps the current mainnet endpoint when it remains healthy", async () => {
    getActiveBasePath.mockImplementation((env) =>
      env === "Mainnet" ? "/rpc/mainnet/primary" : "/rpc/testnet/primary"
    );

    post.mockImplementation(async (url, payload) => {
      if (payload?.method === "getversion") {
        return { data: { result: { protocol: { network: 860833102 } } } };
      }
      if (url.includes("/rpc/mainnet/primary") && payload?.method === "GetBlockCount") {
        return { data: { result: { index: 500 } } };
      }
      throw new Error("ignore deferred network calls");
    });

    const { checkAndSetEndpoints } = await import("../../src/utils/healthCheck.js");
    await checkAndSetEndpoints("Mainnet");

    expect(setActiveBasePath).not.toHaveBeenCalled();
  });
});
