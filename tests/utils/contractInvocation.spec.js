import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildContractParam, invokeContractFunction } from "../../src/utils/contractInvocation.js";
import * as api from "../../src/services/api.js";

vi.mock("../../src/services/api.js", () => ({
  rpc: vi.fn(),
}));

describe("contractInvocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds boolean and integer params", () => {
    expect(buildContractParam("Boolean", "true")).toEqual({ type: "Boolean", value: true });
    expect(buildContractParam("Integer", "123")).toEqual({ type: "Integer", value: "123" });
  });

  it("rejects invalid integer params", () => {
    expect(() => buildContractParam("Integer", "12.5")).toThrow("Integer parameter must be a whole number");
  });

  it("builds array and map params from JSON", () => {
    expect(buildContractParam("Array", "[1,true,\"ok\"]")).toEqual({
      type: "Array",
      value: [
        { type: "Integer", value: "1" },
        { type: "Boolean", value: true },
        { type: "String", value: "ok" },
      ],
    });

    expect(buildContractParam("Map", '{"name":"neo","count":2}')).toEqual({
      type: "Map",
      value: [
        { key: { type: "String", value: "name" }, value: { type: "String", value: "neo" } },
        { key: { type: "String", value: "count" }, value: { type: "Integer", value: "2" } },
      ],
    });
  });

  it("invokes contract function through rpc wrapper", async () => {
    api.rpc.mockResolvedValueOnce({ stack: [] });

    await invokeContractFunction("0xabc", "balanceOf", [
      { type: "Hash160", value: "Nabc" },
      { type: "Integer", value: "1" },
    ]);

    expect(api.rpc).toHaveBeenCalledWith("invokefunction", [
      "0xabc",
      "balanceOf",
      [
        { type: "Hash160", value: "Nabc" },
        { type: "Integer", value: "1" },
      ],
    ]);
  });

  it("normalizes a base58 N-address Hash160 param to hex", () => {
    // Known mainnet vector — keep in sync with installer self-test
    expect(buildContractParam("Hash160", "NNqXaTyKBAbG1SZHYrbycW1HQJjmcdcSMa")).toEqual({
      type: "Hash160",
      value: "408b58900a52b5c2eb599c6cc5c538752e561120",
    });
  });

  it("preserves an already-hex Hash160 param (sans 0x)", () => {
    expect(buildContractParam("Hash160", "0xABCDEF1234567890ABCDEF1234567890ABCDEF12")).toEqual({
      type: "Hash160",
      value: "abcdef1234567890abcdef1234567890abcdef12",
    });
  });

  it("appends signers array to invokefunction when provided", async () => {
    api.rpc.mockResolvedValueOnce({ stack: [] });

    const signers = [{ account: "deadbeef", scopes: 1 }];
    await invokeContractFunction("0xabc", "balanceOf", [{ type: "Integer", value: "1" }], signers);

    expect(api.rpc).toHaveBeenCalledWith("invokefunction", [
      "0xabc",
      "balanceOf",
      [{ type: "Integer", value: "1" }],
      signers,
    ]);
  });

  it("omits signers array when none are provided", async () => {
    api.rpc.mockResolvedValueOnce({ stack: [] });

    await invokeContractFunction("0xabc", "decimals", []);

    expect(api.rpc).toHaveBeenCalledWith("invokefunction", ["0xabc", "decimals", []]);
  });
});
