import { getNativeTokenBadge } from "@/utils/nativeTokenBadge";
import { GAS_HASH, NEO_HASH } from "@/constants";
import { getTokenIcon } from "@/utils/getTokenIcon";
import { vi } from "vitest";

vi.mock("@/utils/getTokenIcon", () => ({
  getTokenIcon: vi.fn((hash, type) => `icon-${hash}-${type}`),
}));

describe("getNativeTokenBadge", () => {
  it("returns NEO badge when contractHash matches NEO_HASH", () => {
    const result = getNativeTokenBadge(NEO_HASH, "");
    expect(result).toEqual({
      alt: "NEO",
      src: getTokenIcon(NEO_HASH, "NEP17"),
    });
  });

  it("returns GAS badge when contractHash matches GAS_HASH", () => {
    const result = getNativeTokenBadge(GAS_HASH, "");
    expect(result).toEqual({
      alt: "GAS",
      src: getTokenIcon(GAS_HASH, "NEP17"),
    });
  });

  it("returns NEO badge when label matches NEO pattern", () => {
    expect(getNativeTokenBadge("", "NeoToken")).not.toBeNull();
    expect(getNativeTokenBadge("", "NeoToken").alt).toBe("NEO");
    expect(getNativeTokenBadge("", "NEO:something").alt).toBe("NEO");
  });

  it("returns GAS badge when label matches GAS pattern", () => {
    expect(getNativeTokenBadge("", "GasToken").alt).toBe("GAS");
    expect(getNativeTokenBadge("", "GAS:something").alt).toBe("GAS");
  });

  it("normalizes hash without 0x prefix", () => {
    const raw = NEO_HASH.replace("0x", "");
    const result = getNativeTokenBadge(raw, "");
    expect(result).not.toBeNull();
    expect(result.alt).toBe("NEO");
  });

  it("returns null for unknown contract and label", () => {
    expect(getNativeTokenBadge("0xdeadbeef", "SomeToken")).toBeNull();
  });

  it("handles null/undefined inputs gracefully", () => {
    expect(getNativeTokenBadge(null, null)).toBeNull();
    expect(getNativeTokenBadge(undefined, undefined)).toBeNull();
    expect(getNativeTokenBadge("", "")).toBeNull();
  });
});
