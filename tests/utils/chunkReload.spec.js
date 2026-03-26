import { describe, it, expect, vi } from "vitest";
import { CHUNK_RELOAD_KEY, CHUNK_RELOAD_TARGET_KEY, isChunkLoadError, triggerChunkReload } from "@/utils/chunkReload";

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

  describe("triggerChunkReload", () => {
    it("navigates to a cache-busted target path on first trigger", () => {
      const store = new Map();
      const storage = {
        getItem: (key) => store.get(key) ?? null,
        setItem: (key, value) => store.set(key, value),
        removeItem: (key) => store.delete(key),
      };
      const location = {
        href: "https://www.neo3scan.com/homepage",
        assign: vi.fn(),
        reload: vi.fn(),
      };

      const result = triggerChunkReload("/homepage", { storage, location });

      expect(result).toBe(true);
      expect(storage.getItem(CHUNK_RELOAD_KEY)).toBe("1");
      expect(storage.getItem(CHUNK_RELOAD_TARGET_KEY)).toBe("/homepage");
      expect(location.assign).toHaveBeenCalledTimes(1);
      expect(location.assign.mock.calls[0][0]).toMatch(/^\/homepage\?__chunk_reload=\d+$/);
    });

    it("returns false on the second trigger and clears the reload markers", () => {
      const store = new Map([
        [CHUNK_RELOAD_KEY, "1"],
        [CHUNK_RELOAD_TARGET_KEY, "/homepage"],
      ]);
      const storage = {
        getItem: (key) => store.get(key) ?? null,
        setItem: (key, value) => store.set(key, value),
        removeItem: (key) => store.delete(key),
      };
      const location = {
        href: "https://www.neo3scan.com/homepage",
        assign: vi.fn(),
        reload: vi.fn(),
      };

      const result = triggerChunkReload("/homepage", { storage, location });

      expect(result).toBe(false);
      expect(storage.getItem(CHUNK_RELOAD_KEY)).toBe(null);
      expect(storage.getItem(CHUNK_RELOAD_TARGET_KEY)).toBe(null);
      expect(location.assign).not.toHaveBeenCalled();
      expect(location.reload).not.toHaveBeenCalled();
    });
  });
});
