import { describe, it, expect } from "vitest";
import {
  NET_ENV,
  getNetworkRefreshIntervalMs,
  getRpcClientUrl,
  setCurrentEnv,
} from "../../src/utils/env.js";

describe("env refresh intervals", () => {
  it("uses 8 seconds for mainnet", () => {
    expect(getNetworkRefreshIntervalMs(NET_ENV.Mainnet)).toBe(8000);
  });

  it("uses 3 seconds for testnet", () => {
    expect(getNetworkRefreshIntervalMs(NET_ENV.TestT5)).toBe(3000);
    expect(getNetworkRefreshIntervalMs("Testnet")).toBe(3000);
  });

  it("falls back to mainnet interval for unknown env", () => {
    expect(getNetworkRefreshIntervalMs("UnknownNetwork")).toBe(8000);
  });
});

describe("rpc client url", () => {
  it("returns an absolute mainnet URL by default", () => {
    window.localStorage.removeItem("neo_explorer_network");
    expect(getRpcClientUrl()).toBe(`${window.location.origin}/api/mainnet`);
  });

  it("returns an absolute testnet URL when switched to testnet", () => {
    setCurrentEnv(NET_ENV.TestT5);
    expect(getRpcClientUrl()).toBe(`${window.location.origin}/api/testnet`);
  });
});
