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
});
