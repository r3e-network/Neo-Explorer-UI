import { describe, it, expect } from "vitest";
import { convertToken, convertISOTime } from "../../src/store/util";

describe("store/util", () => {
  describe("convertToken", () => {
    it("converts token with 8 decimals", () => {
      expect(convertToken(100000000, 8)).toBe("1");
    });

    it("converts token with 0 decimals", () => {
      expect(convertToken(100, 0)).toBe("100");
    });
  });

  describe("convertISOTime", () => {
    it("formats timestamp to ISO format", () => {
      // Use a fixed timestamp: 2024-01-15 10:30:45
      const timestamp = new Date(2024, 0, 15, 10, 30, 45).getTime();
      const result = convertISOTime(timestamp);
      expect(result).toBe("2024-01-15 10:30:45");
    });

    it("pads single digit values with zeros", () => {
      // 2024-01-05 09:05:05
      const timestamp = new Date(2024, 0, 5, 9, 5, 5).getTime();
      const result = convertISOTime(timestamp);
      expect(result).toBe("2024-01-05 09:05:05");
    });
  });
});
