import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
const setActiveBasePath = vi.fn();
const getCurrentEnv = vi.fn(() => "Mainnet");
const getActiveBasePath = vi.fn((env) => (env === "TestT5" ? "/api/testnet/primary" : "/api/mainnet/primary"));
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

  it("selects fallback when primary endpoint fails and fallback is healthy", async () => {
    post.mockImplementation(async (url) => {
      if (url.includes("/api/mainnet/primary")) {
        throw new Error("primary down");
      }
      if (url === "/api/mainnet/fallback") {
        return { data: { result: { index: 100 } } };
      }
      throw new Error("ignore deferred network calls");
    });

    const { checkAndSetEndpoints } = await import("../../src/utils/healthCheck.js");
    await checkAndSetEndpoints("Mainnet");

    expect(setActiveBasePath).toHaveBeenCalledWith("Mainnet", "/api/mainnet/fallback");
  });

  it("prefers fallback when both are healthy but fallback is much faster", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));
    post.mockImplementation((url) => {
      if (url.includes("/api/mainnet/primary")) {
        return new Promise((resolve) =>
          setTimeout(() => resolve({ data: { result: { index: 500 } } }), 1600)
        );
      }
      if (url === "/api/mainnet/fallback") {
        return new Promise((resolve) =>
          setTimeout(() => resolve({ data: { result: { index: 500 } } }), 15)
        );
      }
      throw new Error("ignore deferred network calls");
    });

    const { checkAndSetEndpoints } = await import("../../src/utils/healthCheck.js");
    try {
      const pending = checkAndSetEndpoints("Mainnet");
      await vi.runAllTimersAsync();
      await pending;
    } finally {
      vi.useRealTimers();
    }

    expect(setActiveBasePath).toHaveBeenCalledWith("Mainnet", "/api/mainnet/fallback");
  });

  it("rejects endpoints with wrong network magic and picks the endpoint matching the selected network", async () => {
    post.mockImplementation(async (url, payload) => {
      const method = payload?.method;
      if (url.includes("/api/mainnet/primary") && method === "getversion") {
        return { data: { result: { protocol: { network: 894710606 } } } };
      }
      if (url.includes("/api/mainnet/primary") && method === "GetBlockCount") {
        return { data: { result: { index: 500 } } };
      }
      if (url === "/api/mainnet/fallback" && method === "getversion") {
        return { data: { result: { protocol: { network: 860833102 } } } };
      }
      if (url === "/api/mainnet/fallback" && method === "GetBlockCount") {
        return { data: { result: { index: 490 } } };
      }
      throw new Error(`unexpected call: ${url} ${method}`);
    });

    const { checkAndSetEndpoints } = await import("../../src/utils/healthCheck.js");
    await checkAndSetEndpoints("Mainnet");

    expect(setActiveBasePath).toHaveBeenCalledWith("Mainnet", "/api/mainnet/fallback");
  });

  it("keeps current route when all local candidates are wrong-network", async () => {
    post.mockImplementation(async (url, payload) => {
      const method = payload?.method;
      if (url.includes("/api/mainnet/") && method === "getversion") {
        return { data: { result: { protocol: { network: 894710606 } } } };
      }
      if (url.includes("/api/mainnet/") && method === "GetBlockCount") {
        return { data: { result: { index: 100 } } };
      }
      throw new Error(`unexpected call: ${url} ${method}`);
    });

    const { checkAndSetEndpoints } = await import("../../src/utils/healthCheck.js");
    await checkAndSetEndpoints("Mainnet");

    expect(setActiveBasePath).not.toHaveBeenCalled();
  });

  it("treats slower but healthy probes as valid when the default timeout budget covers them", async () => {
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

  it("keeps the current mainnet endpoint when it remains healthy and the alternative is only slightly faster", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));
    getActiveBasePath.mockImplementation((env) =>
      env === "Mainnet" ? "/api/mainnet/primary" : "/api/testnet/primary"
    );

    post.mockImplementation((url) => {
      if (url.includes("/api/mainnet/primary")) {
        return new Promise((resolve) =>
          setTimeout(() => resolve({ data: { result: { index: 500 } } }), 220)
        );
      }
      if (url === "/api/mainnet/fallback") {
        return new Promise((resolve) =>
          setTimeout(() => resolve({ data: { result: { index: 500 } } }), 40)
        );
      }
      throw new Error("ignore deferred network calls");
    });

    const { checkAndSetEndpoints } = await import("../../src/utils/healthCheck.js");
    try {
      const pending = checkAndSetEndpoints("Mainnet");
      await vi.runAllTimersAsync();
      await pending;
    } finally {
      vi.useRealTimers();
    }

    expect(setActiveBasePath).not.toHaveBeenCalledWith("Mainnet", "/api/mainnet/fallback");
  });

  it("does not log an endpoint switch when the selected endpoint is unchanged", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));
    getActiveBasePath.mockImplementation((env) =>
      env === "Mainnet" ? "/api/mainnet/fallback" : "/api/testnet/primary"
    );

    post.mockImplementation((url) => {
      if (url.includes("/api/mainnet/primary")) {
        return new Promise((resolve) =>
          setTimeout(() => resolve({ data: { result: { index: 500 } } }), 260)
        );
      }
      if (url === "/api/mainnet/fallback") {
        return new Promise((resolve) =>
          setTimeout(() => resolve({ data: { result: { index: 500 } } }), 25)
        );
      }
      throw new Error("ignore deferred network calls");
    });

    const { checkAndSetEndpoints } = await import("../../src/utils/healthCheck.js");
    try {
      const pending = checkAndSetEndpoints("Mainnet");
      await vi.runAllTimersAsync();
      await pending;
    } finally {
      vi.useRealTimers();
    }

    expect(setActiveBasePath).not.toHaveBeenCalled();
    expect(consoleInfoSpy).not.toHaveBeenCalled();
  });

  it("promotes a deeper backup endpoint when it is the freshest healthy candidate", async () => {
    post.mockImplementation(async (url, payload) => {
      const method = payload?.method;
      if (method === "getversion") {
        return { data: { result: { protocol: { network: 860833102 } } } };
      }
      if (method === "GetBlockCount" && url === "/api/mainnet/primary") {
        return { data: { result: { index: 100 } } };
      }
      if (method === "GetBlockCount" && url === "/api/mainnet/fallback") {
        return { data: { result: { index: 101 } } };
      }
      if (method === "GetBlockCount" && url === "/api/mainnet/fallback2") {
        return { data: { result: { index: 105 } } };
      }
      if (method === "GetBlockCount" && url === "/api/mainnet/fallback3") {
        return { data: { result: { index: 104 } } };
      }
      throw new Error(`unexpected call: ${url} ${method}`);
    });

    const { checkAndSetEndpoints } = await import("../../src/utils/healthCheck.js");
    await checkAndSetEndpoints("Mainnet");

    expect(setActiveBasePath).toHaveBeenCalledWith("Mainnet", "/api/mainnet/fallback2");
  });
});
