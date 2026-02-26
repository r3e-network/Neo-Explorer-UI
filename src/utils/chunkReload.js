export const CHUNK_RELOAD_KEY = "chunk-reload";
export const CHUNK_RELOAD_TARGET_KEY = "chunk-reload-target";

export function isChunkLoadError(error) {
  if (!error) return false;
  const message = String(error.message || "");
  return (
    error.name === "ChunkLoadError" ||
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Loading chunk")
  );
}

export function triggerChunkReload(
  targetPath,
  {
    storage = typeof window !== "undefined" ? window.sessionStorage : null,
    location = typeof window !== "undefined" ? window.location : null,
  } = {}
) {
  if (!storage || !location) return false;

  if (storage.getItem(CHUNK_RELOAD_KEY)) {
    storage.removeItem(CHUNK_RELOAD_KEY);
    storage.removeItem(CHUNK_RELOAD_TARGET_KEY);
    return false;
  }

  const target =
    typeof targetPath === "string" && targetPath.trim()
      ? targetPath
      : storage.getItem(CHUNK_RELOAD_TARGET_KEY);

  storage.setItem(CHUNK_RELOAD_KEY, "1");
  if (target) {
    storage.setItem(CHUNK_RELOAD_TARGET_KEY, target);
  }

  if (target && typeof location.assign === "function") {
    location.assign(target);
    return true;
  }

  if (typeof location.reload === "function") {
    location.reload();
    return true;
  }

  return true;
}
