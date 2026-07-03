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
      path: "/source-code",
      query: { contractHash: "0xabc", updatecounter: "3" },
    });

    expect(buildSourceCodeLocation("0xabc", "oops")).toEqual({
      path: "/source-code",
      query: { contractHash: "0xabc", updatecounter: "0" },
    });
  });

  it("preserves safe manifest source URLs on the full source-code route", () => {
    expect(buildSourceCodeLocation("0xabc", 3, "https://github.com/r3e-network/sample/blob/main/Contract.cs")).toEqual({
      path: "/source-code",
      query: {
        contractHash: "0xabc",
        updatecounter: "3",
        source: "https://github.com/r3e-network/sample/blob/main/Contract.cs",
      },
    });

    expect(buildSourceCodeLocation("0xabc", 3, "javascript:alert(1)")).toEqual({
      path: "/source-code",
      query: { contractHash: "0xabc", updatecounter: "3" },
    });
  });

  it("returns standard contract detail tabs (with i18n label keys)", () => {
    expect(getContractDetailTabs()).toEqual([
      { key: "transactions", labelKey: "contractDetail.tabTransactions" },
      { key: "events", labelKey: "contractDetail.tabEvents" },
      { key: "readContract", labelKey: "contractDetail.tabReadContract" },
      { key: "writeContract", labelKey: "contractDetail.tabWriteContract" },
      { key: "code", labelKey: "contractDetail.tabCode" },
    ]);
  });

  it("returns standard token detail tabs (with i18n label keys)", () => {
    expect(getTokenDetailTabs()).toEqual([
      { key: "transfers", labelKey: "tokenDetail.tabTransfers" },
      { key: "holders", labelKey: "tokenDetail.holdersHeader" },
    ]);
  });
});
