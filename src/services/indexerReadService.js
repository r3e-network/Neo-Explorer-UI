import { getCurrentEnv } from "@/utils/env";

const INDEXER_TIMEOUT_MS = 3000;
const INDEXER_READ_BASE_URL = String(
  import.meta.env.VITE_INDEXER_READ_BASE_URL || "https://api.n3index.dev",
)
  .trim()
  .replace(/\/+$/, "");
const INDEXER_READ_FALLBACK_BASE_URLS = String(
  import.meta.env.VITE_INDEXER_READ_FALLBACK_BASE_URLS ||
    "https://api1.n3index.dev,https://api2.n3index.dev,https://api3.n3index.dev",
)
  .split(",")
  .map((value) => String(value || "").trim().replace(/\/+$/, ""))
  .filter(Boolean);

function resolveIndexerNetworkPath() {
  const env = String(getCurrentEnv() || "").toLowerCase();
  return env.includes("test") || env.includes("t5") ? "testnet" : "mainnet";
}

function withCacheBusting(path, forceRefresh = false) {
  if (!forceRefresh) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}_ts=${Date.now()}`;
}

function isAbsoluteUrl(path) {
  return /^https?:\/\//i.test(String(path || "").trim());
}

async function fetchIndexerJson(path, { timeoutMs = INDEXER_TIMEOUT_MS, forceRefresh = false, retryAbsolute = true } = {}) {
  if (typeof fetch !== "function") return null;

  const requestPath = withCacheBusting(path, forceRefresh);
  const attempts = isAbsoluteUrl(requestPath) && retryAbsolute ? 2 : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    const headers = { Accept: "application/json" };
    if (forceRefresh && !isAbsoluteUrl(requestPath)) {
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
      if (!res.ok) continue;
      return await res.json();
    } catch {
      // Retry transient network errors once for absolute indexer origins.
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  return null;
}

async function fetchIndexerJsonWithFallback(paths, options = {}) {
  const filteredPaths = paths.filter(Boolean);
  for (let index = 0; index < filteredPaths.length; index += 1) {
    const path = filteredPaths[index];
    const payload = await fetchIndexerJson(path, {
      ...options,
      retryAbsolute: index === 0,
    });
    if (payload) return payload;
  }
  return null;
}

function buildIndexerFallbackPaths(network, pathSuffix) {
  return [
    `${INDEXER_READ_BASE_URL}/${network}/${pathSuffix}`,
    ...INDEXER_READ_FALLBACK_BASE_URLS.map((baseUrl) => `${baseUrl}/${network}/${pathSuffix}`),
    `/indexer/${network}/${pathSuffix}`,
  ];
}

export const indexerReadService = {
  async getSummary(options = {}) {
    const network = resolveIndexerNetworkPath();
    const payload = await fetchIndexerJsonWithFallback(
      buildIndexerFallbackPaths(network, "summary"),
      options,
    );
    return payload?.data || null;
  },

  async getBlocks(limit = 20, offset = 0, options = {}) {
    const network = resolveIndexerNetworkPath();
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return await fetchIndexerJsonWithFallback(
      buildIndexerFallbackPaths(network, `blocks?${params.toString()}`),
      options,
    );
  },

  async getTransactions(limit = 20, offset = 0, options = {}) {
    const network = resolveIndexerNetworkPath();
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return await fetchIndexerJsonWithFallback(
      buildIndexerFallbackPaths(network, `transactions?${params.toString()}`),
      options,
    );
  },

  async getContracts(limit = 20, offset = 0, { search = "", ...options } = {}) {
    const network = resolveIndexerNetworkPath();
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    if (String(search || "").trim()) {
      params.set("search", String(search).trim());
    }
    return await fetchIndexerJsonWithFallback(
      buildIndexerFallbackPaths(network, `contracts?${params.toString()}`),
      options,
    );
  },

  async getTokens(standard, limit = 20, offset = 0, { search = "", ...options } = {}) {
    const network = resolveIndexerNetworkPath();
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    if (String(standard || "").trim()) {
      params.set("standard", String(standard).trim());
    }
    if (String(search || "").trim()) {
      params.set("search", String(search).trim());
    }
    return await fetchIndexerJsonWithFallback(
      buildIndexerFallbackPaths(network, `tokens?${params.toString()}`),
      options,
    );
  },

  async getToken(contractHash, options = {}) {
    const network = resolveIndexerNetworkPath();
    if (!contractHash) return null;
    const payload = await fetchIndexerJsonWithFallback(
      buildIndexerFallbackPaths(network, `tokens/${contractHash}`),
      options,
    );
    return payload?.data || null;
  },

  async getDailyAnalytics(days = 30, options = {}) {
    const network = resolveIndexerNetworkPath();
    const params = new URLSearchParams({
      days: String(days),
    });
    const payload = await fetchIndexerJsonWithFallback(
      buildIndexerFallbackPaths(network, `analytics/daily?${params.toString()}`),
      options,
    );
    return Array.isArray(payload?.data) ? payload.data : [];
  },
};

export default indexerReadService;
