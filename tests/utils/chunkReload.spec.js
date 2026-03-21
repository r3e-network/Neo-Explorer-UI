import { describe, it, expect } from "vitest";
import { isChunkLoadError } from "@/utils/chunkReload";

describe("chunkReload", () => {
  describe("isChunkLoadError", () => {
    it("returns false for null/undefined", () => {
      expect(isChunkLoadError(null)).toBe(false);
      expect(isChunkLoadError(undefined)).toBe(false);
    });

    it("detects ChunkLoadError by name", () => {
      const err = new Error("test");
      err.name = "ChunkLoadError";
      expect(isChunkLoadError(err)).toBe(true);
    });

    it("detects dynamic import failure message", () => {
      expect(isChunkLoadError(new Error("Failed to fetch dynamically imported module /foo.js"))).toBe(true);
    });

    it("detects loading chunk message", () => {
      expect(isChunkLoadError(new Error("Loading chunk 42 failed"))).toBe(true);
    });

    it("returns false for unrelated errors", () => {
      expect(isChunkLoadError(new Error("Network error"))).toBe(false);
    });
  });
});
