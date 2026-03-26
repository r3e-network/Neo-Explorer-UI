export const CHUNK_RELOAD_KEY = "chunk-reload";
export const CHUNK_RELOAD_TARGET_KEY = "chunk-reload-target";
export const CHUNK_RELOAD_QUERY_KEY = "__chunk_reload";

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
  } = {},
) {
  if (!storage || !location) return false;

  if (storage.getItem(CHUNK_RELOAD_KEY)) {
    storage.removeItem(CHUNK_RELOAD_KEY);
    storage.removeItem(CHUNK_RELOAD_TARGET_KEY);
    return false;
  }

  const target =
    typeof targetPath === "string" && targetPath.trim() ? targetPath : storage.getItem(CHUNK_RELOAD_TARGET_KEY);

  storage.setItem(CHUNK_RELOAD_KEY, "1");
  if (target) {
    storage.setItem(CHUNK_RELOAD_TARGET_KEY, target);
  }

  const buildReloadTarget = () => {
    if (!target) return null;
    try {
      const url = new URL(target, location.href);
      url.searchParams.set(CHUNK_RELOAD_QUERY_KEY, String(Date.now()));
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      const separator = target.includes("?") ? "&" : "?";
      return `${target}${separator}${CHUNK_RELOAD_QUERY_KEY}=${Date.now()}`;
    }
  };

  const reloadTarget = buildReloadTarget();

  if (reloadTarget && typeof location.assign === "function") {
    location.assign(reloadTarget);
    return true;
  }

  if (typeof location.reload === "function") {
    location.reload();
    return true;
  }

  return true;
}
