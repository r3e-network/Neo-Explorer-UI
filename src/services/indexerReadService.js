import { getCurrentEnv } from "@/utils/env";

const INDEXER_TIMEOUT_MS = 3000;

function resolveIndexerNetworkPath() {
  const env = String(getCurrentEnv() || "").toLowerCase();
  return env.includes("test") || env.includes("t5") ? "testnet" : "mainnet";
}

function withCacheBusting(path, forceRefresh = false) {
  if (!forceRefresh) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}_ts=${Date.now()}`;
}

async function fetchIndexerJson(path, { timeoutMs = INDEXER_TIMEOUT_MS, forceRefresh = false } = {}) {
  if (typeof fetch !== "function") return null;

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const requestPath = withCacheBusting(path, forceRefresh);
  const headers = { Accept: "application/json" };
  if (forceRefresh) {
    headers["Cache-Control"] = "no-cache";
    headers.Pragma = "no-cache";
  }

  try {
    const res = await fetch(requestPath, {
      method: "GET",
      headers,
      ...(forceRefresh ? { cache: "no-store" } : {}),
      signal: controller?.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const indexerReadService = {
  async getSummary(options = {}) {
    const network = resolveIndexerNetworkPath();
    const payload = await fetchIndexerJson(`/indexer/${network}/summary`, options);
    return payload?.data || null;
  },

  async getBlocks(limit = 20, offset = 0, options = {}) {
    const network = resolveIndexerNetworkPath();
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return await fetchIndexerJson(`/indexer/${network}/blocks?${params.toString()}`, options);
  },

  async getTransactions(limit = 20, offset = 0, options = {}) {
    const network = resolveIndexerNetworkPath();
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return await fetchIndexerJson(`/indexer/${network}/transactions?${params.toString()}`, options);
  },
};

export default indexerReadService;
