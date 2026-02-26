import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
const setActiveBasePath = vi.fn();
const getCurrentEnv = vi.fn(() => "Mainnet");

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
  setActiveBasePath,
}));

describe("healthCheck endpoint selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("selects fallback when primary endpoint fails and fallback is healthy", async () => {
    post.mockImplementation(async (url) => {
      if (url.includes("/api/mainnet/primary")) {
        throw new Error("primary down");
      }
      if (url.includes("/api/mainnet/fallback")) {
        return { data: { result: { index: 100 } } };
      }
      throw new Error("ignore deferred network calls");
    });

    const { checkAndSetEndpoints } = await import("../../src/utils/healthCheck.js");
    await checkAndSetEndpoints("Mainnet");

    expect(setActiveBasePath).toHaveBeenCalledWith("Mainnet", "/api/mainnet/fallback");
  });

  it("prefers lower-latency endpoint when heights are effectively equal", async () => {
    post.mockImplementation((url) => {
      if (url.includes("/api/mainnet/primary")) {
        return new Promise((resolve) =>
          setTimeout(() => resolve({ data: { result: { index: 500 } } }), 220)
        );
      }
      if (url.includes("/api/mainnet/fallback")) {
        return new Promise((resolve) =>
          setTimeout(() => resolve({ data: { result: { index: 500 } } }), 15)
        );
      }
      throw new Error("ignore deferred network calls");
    });

    const { checkAndSetEndpoints } = await import("../../src/utils/healthCheck.js");
    await checkAndSetEndpoints("Mainnet");

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
      if (url.includes("/api/mainnet/fallback") && method === "getversion") {
        return { data: { result: { protocol: { network: 860833102 } } } };
      }
      if (url.includes("/api/mainnet/fallback") && method === "GetBlockCount") {
        return { data: { result: { index: 490 } } };
      }
      throw new Error(`unexpected call: ${url} ${method}`);
    });

    const { checkAndSetEndpoints } = await import("../../src/utils/healthCheck.js");
    await checkAndSetEndpoints("Mainnet");

    expect(setActiveBasePath).toHaveBeenCalledWith("Mainnet", "/api/mainnet/fallback");
  });

  it("falls back to public rpc endpoint when all local candidates are wrong-network", async () => {
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

    expect(setActiveBasePath).toHaveBeenCalledWith("Mainnet", "https://neofura.ngd.network");
  });
});
