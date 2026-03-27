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
  it("returns a same-origin absolute mainnet URL by default", () => {
    window.localStorage.removeItem("neo_explorer_network");
    expect(getActiveBasePath()).toBe("/rpc/mainnet");
    expect(getRpcApiBasePath()).toBe("/rpc/mainnet");
    expect(getRpcClientUrl()).toBe(new URL("/rpc/mainnet", window.location.origin).toString());
  });

  it("returns a same-origin absolute testnet URL when switched to testnet", () => {
    setCurrentEnv(NET_ENV.TestT5);
    expect(getActiveBasePath()).toBe("/rpc/testnet");
    expect(getRpcApiBasePath()).toBe("/rpc/testnet");
    expect(getRpcClientUrl()).toBe(new URL("/rpc/testnet", window.location.origin).toString());
  });
});
