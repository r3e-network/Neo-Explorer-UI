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
const HOT_INDEXER_SELECTION_TTL_MS = Math.max(
  5_000,
  Number(import.meta.env.VITE_INDEXER_HOT_SELECTION_TTL_MS || 30_000),
);
const hotIndexerSelectionCache = new Map();

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

function getHotIndexerCacheKey(network) {
  return String(network || "").trim().toLowerCase() || "mainnet";
}

function getCachedHotIndexerBase(network) {
  const key = getHotIndexerCacheKey(network);
  const cached = hotIndexerSelectionCache.get(key);
  if (!cached) return "";
  if (Date.now() - cached.checkedAt > HOT_INDEXER_SELECTION_TTL_MS) return "";
  return cached.baseUrl;
}

function setCachedHotIndexerBase(network, baseUrl) {
  const normalized = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!normalized) return;
  hotIndexerSelectionCache.set(getHotIndexerCacheKey(network), {
    baseUrl: normalized,
    checkedAt: Date.now(),
  });
}

async function selectFreshestHotIndexerBase(network, { forceRefresh = false } = {}) {
  const cached = getCachedHotIndexerBase(network);
  if (cached) return cached;

  const candidates = [
    INDEXER_READ_BASE_URL,
    ...INDEXER_READ_FALLBACK_BASE_URLS,
  ]
    .map((baseUrl) => String(baseUrl || "").trim().replace(/\/+$/, ""))
    .filter(Boolean);

  const results = await Promise.all(
    candidates.map(async (baseUrl) => {
      const payload = await fetchIndexerJson(`${baseUrl}/${network}/summary`, {
        forceRefresh,
        retryAbsolute: false,
      });
      const data = payload?.data || payload || {};
      const lastIndexedBlock = Number(data?.last_indexed_block ?? data?.lastIndexedBlock ?? -1);
      const freshnessSeconds = Number(data?.freshness_seconds ?? data?.freshnessSeconds ?? Number.POSITIVE_INFINITY);
      return {
        baseUrl,
        lastIndexedBlock: Number.isFinite(lastIndexedBlock) ? lastIndexedBlock : -1,
        freshnessSeconds: Number.isFinite(freshnessSeconds) ? freshnessSeconds : Number.POSITIVE_INFINITY,
      };
    }),
  );

  const healthy = results.filter((item) => item.lastIndexedBlock >= 0);
  if (healthy.length === 0) {
    return INDEXER_READ_BASE_URL;
  }

  const freshest = healthy.sort((left, right) => {
    if (right.lastIndexedBlock !== left.lastIndexedBlock) {
      return right.lastIndexedBlock - left.lastIndexedBlock;
    }
    if (left.freshnessSeconds !== right.freshnessSeconds) {
      return left.freshnessSeconds - right.freshnessSeconds;
    }
    return candidates.indexOf(left.baseUrl) - candidates.indexOf(right.baseUrl);
  })[0];

  setCachedHotIndexerBase(network, freshest.baseUrl);
  return freshest.baseUrl;
}

async function buildHotIndexerPaths(network, pathSuffix, options = {}) {
  const preferredBaseUrl = await selectFreshestHotIndexerBase(network, options);
  const orderedBases = [
    preferredBaseUrl,
    INDEXER_READ_BASE_URL,
    ...INDEXER_READ_FALLBACK_BASE_URLS,
  ]
    .map((baseUrl) => String(baseUrl || "").trim().replace(/\/+$/, ""))
    .filter(Boolean)
    .filter((baseUrl, index, items) => items.indexOf(baseUrl) === index);

  return [
    ...orderedBases.map((baseUrl) => `${baseUrl}/${network}/${pathSuffix}`),
    `/indexer/${network}/${pathSuffix}`,
  ];
}

function shouldUseHotIndexerSelection({ pathType = "", forceRefresh = false, limit = 0, offset = 0 } = {}) {
  if (pathType === "summary") return true;
  if (!forceRefresh) return false;
  if (offset !== 0) return false;
  return Number(limit || 0) > 0 && Number(limit || 0) <= 20;
}

export const indexerReadService = {
  async getSummary(options = {}) {
    const network = resolveIndexerNetworkPath();
    const hotPaths = shouldUseHotIndexerSelection({ pathType: "summary", ...options })
      ? await buildHotIndexerPaths(network, "summary", options)
      : buildIndexerFallbackPaths(network, "summary");
    const payload = await fetchIndexerJsonWithFallback(
      hotPaths,
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
    const hotPaths = shouldUseHotIndexerSelection({ pathType: "blocks", limit, offset, ...options })
      ? await buildHotIndexerPaths(network, `blocks?${params.toString()}`, options)
      : buildIndexerFallbackPaths(network, `blocks?${params.toString()}`);
    return await fetchIndexerJsonWithFallback(
      hotPaths,
      options,
    );
  },

  async getTransactions(limit = 20, offset = 0, options = {}) {
    const network = resolveIndexerNetworkPath();
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    const hotPaths = shouldUseHotIndexerSelection({ pathType: "transactions", limit, offset, ...options })
      ? await buildHotIndexerPaths(network, `transactions?${params.toString()}`, options)
      : buildIndexerFallbackPaths(network, `transactions?${params.toString()}`);
    return await fetchIndexerJsonWithFallback(
      hotPaths,
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
