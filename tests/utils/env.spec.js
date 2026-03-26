import { describe, it, expect } from "vitest";
import {
  NET_ENV,
  getActiveBasePath,
  getRpcApiBasePath,
  getNetworkRefreshIntervalMs,
  getRpcClientUrl,
  setCurrentEnv,
} from "../../src/utils/env.js";

describe("env refresh intervals", () => {
  it("uses 8 seconds for mainnet", () => {
    expect(getNetworkRefreshIntervalMs(NET_ENV.Mainnet)).toBe(15000);
  });

  it("uses 3 seconds for testnet", () => {
    expect(getNetworkRefreshIntervalMs(NET_ENV.TestT5)).toBe(3000);
    expect(getNetworkRefreshIntervalMs("Testnet")).toBe(3000);
    expect(getNetworkRefreshIntervalMs("testnet")).toBe(3000);
    expect(getNetworkRefreshIntervalMs("testt5")).toBe(3000);
  });

  it("falls back to mainnet interval for unknown env", () => {
    expect(getNetworkRefreshIntervalMs("UnknownNetwork")).toBe(15000);
  });
});

describe("rpc client url", () => {
  it("returns an absolute mainnet URL by default", () => {
    window.localStorage.removeItem("neo_explorer_network");
    expect(getActiveBasePath()).toBe("https://api.n3index.dev/mainnet");
    expect(getRpcApiBasePath()).toBe("https://api.n3index.dev/mainnet");
    expect(getRpcClientUrl()).toBe("https://api.n3index.dev/mainnet");
  });

  it("returns an absolute testnet URL when switched to testnet", () => {
    setCurrentEnv(NET_ENV.TestT5);
    expect(getActiveBasePath()).toBe("https://api.n3index.dev/testnet");
    expect(getRpcApiBasePath()).toBe("https://api.n3index.dev/testnet");
    expect(getRpcClientUrl()).toBe("https://api.n3index.dev/testnet");
  });
});
