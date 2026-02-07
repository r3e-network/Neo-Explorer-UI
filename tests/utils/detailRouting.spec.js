import { describe, it, expect } from "vitest";
import {
  normalizeUpdateCounter,
  buildSourceCodeLocation,
  getContractDetailTabs,
  getTokenDetailTabs,
} from "../../src/utils/detailRouting";

describe("detailRouting", () => {
  it("normalizes update counters to safe integers", () => {
    expect(normalizeUpdateCounter(5)).toBe(5);
    expect(normalizeUpdateCounter("12")).toBe(12);
    expect(normalizeUpdateCounter("abc")).toBe(0);
    expect(normalizeUpdateCounter(-4)).toBe(0);
  });

  it("builds source code route with hash and normalized update counter", () => {
    expect(buildSourceCodeLocation("0xabc", 3)).toEqual({
      path: "/SourceCode",
      query: { contractHash: "0xabc", updatecounter: "3" },
    });

    expect(buildSourceCodeLocation("0xabc", "oops")).toEqual({
      path: "/SourceCode",
      query: { contractHash: "0xabc", updatecounter: "0" },
    });
  });

  it("returns standard contract detail tabs", () => {
    expect(getContractDetailTabs()).toEqual([
      { key: "transactions", label: "Transactions" },
      { key: "code", label: "Code" },
      { key: "events", label: "Events" },
    ]);
  });

  it("returns standard token detail tabs", () => {
    expect(getTokenDetailTabs()).toEqual([
      { key: "transfers", label: "Transfers" },
      { key: "holders", label: "Holders" },
    ]);
  });
});
