import { describe, it, expect } from "vitest";
import { flattenObject } from "@/utils/dataExport";

// Note: exportToCSV/exportToJSON rely on document.createElement and URL.createObjectURL
// which require jsdom. We test the pure utility functions here.

describe("dataExport", () => {
  describe("flattenObject", () => {
    it("flattens nested objects with dot notation", () => {
      const result = flattenObject({ a: { b: { c: 1 } }, d: 2 });
      expect(result).toEqual({ "a.b.c": 1, d: 2 });
    });

    it("handles flat objects unchanged", () => {
      const result = flattenObject({ x: 1, y: "hello" });
      expect(result).toEqual({ x: 1, y: "hello" });
    });

    it("preserves arrays as-is", () => {
      const result = flattenObject({ tags: [1, 2, 3] });
      expect(result).toEqual({ tags: [1, 2, 3] });
    });

    it("handles null values", () => {
      const result = flattenObject({ a: null, b: 1 });
      expect(result).toEqual({ a: null, b: 1 });
    });

    it("handles empty object", () => {
      expect(flattenObject({})).toEqual({});
    });

    it("uses custom prefix", () => {
      const result = flattenObject({ x: 1 }, "root");
      expect(result).toEqual({ "root.x": 1 });
    });
  });
});
