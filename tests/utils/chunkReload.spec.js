import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHUNK_RELOAD_KEY,
  CHUNK_RELOAD_TARGET_KEY,
  isChunkLoadError,
  triggerChunkReload,
} from "@/utils/chunkReload";

function createStorage(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    getItem: vi.fn((key) => (store.has(key) ? store.get(key) : null)),
    setItem: vi.fn((key, value) => {
      store.set(key, String(value));
    }),
    removeItem: vi.fn((key) => {
      store.delete(key);
    }),
  };
}

describe("chunkReload utils", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("detects chunk load errors by name or message patterns", () => {
    expect(isChunkLoadError({ name: "ChunkLoadError" })).toBe(true);
    expect(isChunkLoadError({ message: "Failed to fetch dynamically imported module" })).toBe(true);
    expect(isChunkLoadError({ message: "Loading chunk 123 failed" })).toBe(true);
    expect(isChunkLoadError({ message: "Regular runtime error" })).toBe(false);
  });

  it("stores reload flags and redirects to target on first chunk failure", () => {
    const storage = createStorage();
    const location = {
      assign: vi.fn(),
      reload: vi.fn(),
    };

    const handled = triggerChunkReload("/transaction-info/0xabc", { storage, location });

    expect(handled).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(CHUNK_RELOAD_KEY, "1");
    expect(storage.setItem).toHaveBeenCalledWith(CHUNK_RELOAD_TARGET_KEY, "/transaction-info/0xabc");
    expect(location.assign).toHaveBeenCalledWith("/transaction-info/0xabc");
    expect(location.reload).not.toHaveBeenCalled();
  });

  it("clears flags and stops retry loop on repeated chunk failures", () => {
    const storage = createStorage({
      [CHUNK_RELOAD_KEY]: "1",
      [CHUNK_RELOAD_TARGET_KEY]: "/transaction-info/0xabc",
    });
    const location = {
      assign: vi.fn(),
      reload: vi.fn(),
    };

    const handled = triggerChunkReload("/transaction-info/0xabc", { storage, location });

    expect(handled).toBe(false);
    expect(storage.removeItem).toHaveBeenCalledWith(CHUNK_RELOAD_KEY);
    expect(storage.removeItem).toHaveBeenCalledWith(CHUNK_RELOAD_TARGET_KEY);
    expect(location.assign).not.toHaveBeenCalled();
    expect(location.reload).not.toHaveBeenCalled();
  });
});
