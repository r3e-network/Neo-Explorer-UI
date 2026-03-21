import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/env", () => ({
  getCurrentEnv: vi.fn(() => "mainnet"),
  NET_ENV: { Mainnet: "mainnet", TestT5: "testnet_t5" },
}));

import isOracleReward from "@/utils/isOracleReward";
import { getCurrentEnv } from "@/utils/env";

describe("isOracleReward", () => {
  beforeEach(() => {
    getCurrentEnv.mockReturnValue("mainnet");
  });

  it("returns false for null/undefined", () => {
    expect(isOracleReward(null)).toBe(false);
    expect(isOracleReward(undefined)).toBe(false);
  });

  it("returns false for non-object input", () => {
    expect(isOracleReward("string")).toBe(false);
    expect(isOracleReward(42)).toBe(false);
  });

  it("returns true for valid mainnet oracle reward", () => {
    const item = {
      txid: "0x0000000000000000000000000000000000000000000000000000000000000000",
      from: null,
      value: "10000000",
      to: "0x196b66dd7f8f46a86aa8ef1e845fa10dcecfcbcc",
    };
    expect(isOracleReward(item)).toBe(true);
  });

  it("returns false when txid is not null hash", () => {
    const item = {
      txid: "0xabc123",
      from: null,
      value: "10000000",
      to: "0x196b66dd7f8f46a86aa8ef1e845fa10dcecfcbcc",
    };
    expect(isOracleReward(item)).toBe(false);
  });

  it("returns false when from is not null", () => {
    const item = {
      txid: "0x0000000000000000000000000000000000000000000000000000000000000000",
      from: "some_address",
      value: "10000000",
      to: "0x196b66dd7f8f46a86aa8ef1e845fa10dcecfcbcc",
    };
    expect(isOracleReward(item)).toBe(false);
  });

  it("returns false when value is not oracle reward amount", () => {
    const item = {
      txid: "0x0000000000000000000000000000000000000000000000000000000000000000",
      from: null,
      value: "50000000",
      to: "0x196b66dd7f8f46a86aa8ef1e845fa10dcecfcbcc",
    };
    expect(isOracleReward(item)).toBe(false);
  });

  it("returns false when to address is not in validate list", () => {
    const item = {
      txid: "0x0000000000000000000000000000000000000000000000000000000000000000",
      from: null,
      value: "10000000",
      to: "0xunknownaddress",
    };
    expect(isOracleReward(item)).toBe(false);
  });

  it("returns false for unknown network env", () => {
    getCurrentEnv.mockReturnValue("unknown_network");
    const item = {
      txid: "0x0000000000000000000000000000000000000000000000000000000000000000",
      from: null,
      value: "10000000",
      to: "0x196b66dd7f8f46a86aa8ef1e845fa10dcecfcbcc",
    };
    expect(isOracleReward(item)).toBe(false);
  });
});
