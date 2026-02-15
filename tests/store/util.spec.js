import { describe, it, expect } from "vitest";
import { convertToken } from "../../src/utils/neoHelpers";

describe("store/util (migrated to neoHelpers)", () => {
  describe("convertToken", () => {
    it("converts token with 8 decimals", () => {
      expect(convertToken(100000000, 8)).toBe("1");
    });

    it("converts token with 0 decimals", () => {
      expect(convertToken(100, 0)).toBe("100");
    });
  });
});
