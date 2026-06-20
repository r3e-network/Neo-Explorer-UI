import { resolveNetworkName } from "@/utils/env";
import { recordApiObservationFromResponse } from "@/telemetry/apiObservability";

const INDEXER_TIMEOUT_MS = 3000;
const HOT_INDEXER_SELECTION_TTL_MS = Math.max(
  5_000,
  Number(import.meta.env.VITE_INDEXER_HOT_SELECTION_TTL_MS || 30_000),
);
const EXPLORER_HOME_UNAVAILABLE_RETRY_MS = Math.max(
  5_000,
  Number(import.meta.env.VITE_EXPLORER_HOME_UNAVAILABLE_RETRY_MS || 30_000),
);
const hotIndexerSelectionCache = new Map();
const normalizeBaseUrl = (value) => String(value || "").trim().replace(/\/+$/, "");
const CONFIGURED_INDEXER_READ_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_INDEXER_READ_BASE_URL || "");
const CONFIGURED_INDEXER_READ_FALLBACK_BASE_URLS = String(
  import.meta.env.VITE_INDEXER_READ_FALLBACK_BASE_URLS || "",
)
  .split(",")
  .map(normalizeBaseUrl)
  .filter(Boolean);
const DEFAULT_INDEXER_PUBLIC_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_INDEXER_PROXY_TARGET || "https://api.n3index.dev",
);
const USE_PUBLIC_INDEXER_BASE_BY_DEFAULT =
  Boolean(import.meta.env.PROD) &&
  String(import.meta.env.VITE_INDEXER_USE_SAME_ORIGIN || "").trim().toLowerCase() !== "true";
// Single server — no fallbacks needed.
const DEFAULT_INDEXER_PROXY_BASE_PATHS = Object.freeze(
  USE_PUBLIC_INDEXER_BASE_BY_DEFAULT
    ? {
        mainnet: [`${DEFAULT_INDEXER_PUBLIC_BASE_URL}/mainnet`],
        testnet: [`${DEFAULT_INDEXER_PUBLIC_BASE_URL}/testnet`],
      }
    : {
        mainnet: ["/data/mainnet"],
        testnet: ["/data/testnet"],
      },
);
const explorerHomeUnavailableUntilByNetwork = new Map();

function resolveIndexerNetworkPath(options = {}) {
  const explicitNetwork = typeof options === "string" ? options : options?.network;
  return explicitNetwork ? resolveNetworkName(explicitNetwork) : resolveNetworkName();
}

function withCacheBusting(path, forceRefresh = false) {
  if (!forceRefresh) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}_ts=${Date.now()}`;
}

function isAbsoluteUrl(path) {
  return /^https?:\/\//i.test(String(path || "").trim());
}

function nowMs() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

export function getIndexerBaseUrls(network) {
  const configuredBaseUrls = [
    CONFIGURED_INDEXER_READ_BASE_URL ? `${CONFIGURED_INDEXER_READ_BASE_URL}/${network}` : "",
    ...CONFIGURED_INDEXER_READ_FALLBACK_BASE_URLS.map((baseUrl) => `${baseUrl}/${network}`),
  ].filter(Boolean);

  if (configuredBaseUrls.length > 0) {
    return configuredBaseUrls;
  }

  return DEFAULT_INDEXER_PROXY_BASE_PATHS[network] || DEFAULT_INDEXER_PROXY_BASE_PATHS.mainnet;
}

async function fetchIndexerJson(path, { timeoutMs = INDEXER_TIMEOUT_MS, forceRefresh = false, retryAbsolute = true } = {}) {
  if (typeof fetch !== "function") return null;

  const requestPath = withCacheBusting(path, forceRefresh);
  const attempts = isAbsoluteUrl(requestPath) && retryAbsolute ? 2 : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    const headers = { Accept: "application/json" };
    const startedAt = nowMs();
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
      recordApiObservationFromResponse(res, requestPath, {
        method: "GET",
        source: "indexer",
        durationMs: nowMs() - startedAt,
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
  return getIndexerBaseUrls(network).map((baseUrl) => `${baseUrl}/${pathSuffix}`);
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

  const candidates = getIndexerBaseUrls(network)
    .map(normalizeBaseUrl)
    .filter(Boolean);

  const results = await Promise.all(
    candidates.map(async (baseUrl) => {
      const payload = await fetchIndexerJson(`${baseUrl}/summary`, {
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
    return candidates[0] || `/data/${network}`;
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
    ...getIndexerBaseUrls(network),
  ]
    .map(normalizeBaseUrl)
    .filter(Boolean)
    .filter((baseUrl, index, items) => items.indexOf(baseUrl) === index);

  return orderedBases.map((baseUrl) => `${baseUrl}/${pathSuffix}`);
}

function shouldUseHotIndexerSelection({ pathType = "", forceRefresh = false, limit = 0, offset = 0 } = {}) {
  if (pathType === "summary") return true;
  if (!forceRefresh) return false;
  if (offset !== 0) return false;
  return Number(limit || 0) > 0 && Number(limit || 0) <= 20;
}

// Coalesce concurrent /summary calls. The home page alone fans out to
// 5+ services that each invoke getSummary() in parallel; without dedup
// every consumer triggers its own network round-trip. Keyed by network
// so mainnet/testnet stay isolated. Cleared as soon as the in-flight
// promise settles, so the next call does hit the wire.
const _inflightGetSummary = new Map();

// Short-window result cache layered on top of the in-flight dedup. The
// in-flight map only catches *concurrent* callers — when /summary
// resolves fast (warm CDN), serial callers within the same render burst
// each trigger their own fetch. A 500ms TTL keeps the in-burst fan-out
// down to one fetch without serving meaningfully stale data (the chain
// produces blocks every ~3s).
const _summaryCache = new Map();
const SUMMARY_CACHE_TTL_MS = 500;

// Same pattern for /contracts/<hash> overview. The contract-detail page
// mounts ContractDetail (calls contractService.getByHash) + ScCallTable
// (calls contractService.getScCalls's overviewPromise) at the same tick;
// without dedup that's two raw fetches for the identical URL. Keyed by
// network:hash so different contracts and networks stay isolated.
const _inflightGetContractOverview = new Map();

// Build the Server-Sent Events URL for the realtime head lane. Uses the same
// base resolution as the read-api polls so SSE follows the exact host they hit.
// Returns a plain HTTP(S) URL for EventSource — never a ws:// URL.
export function getIndexerSseUrl(network) {
  const net = String(network || resolveIndexerNetworkPath() || "mainnet").trim().toLowerCase();
  const base = getIndexerBaseUrls(net)[0] || `/data/${net}`;
  return `${base}/sse/head`;
}

// SSE endpoint for the realtime transaction stream. Same base resolution as
// sse/head; the read-api emits one "transactions" event per confirmed block
// carrying that block's transactions.
export function getIndexerSseTransactionsUrl(network) {
  const net = String(network || resolveIndexerNetworkPath() || "mainnet").trim().toLowerCase();
  const base = getIndexerBaseUrls(net)[0] || `/data/${net}`;
  return `${base}/sse/transactions`;
}

export const indexerReadService = {
  async getExplorerHome(limit = 6, options = {}) {
    const network = resolveIndexerNetworkPath(options);
    if (Date.now() < (explorerHomeUnavailableUntilByNetwork.get(network) || 0)) return null;
    const params = new URLSearchParams({
      limit: String(limit),
    });
    const payload = await fetchIndexerJsonWithFallback(
      buildIndexerFallbackPaths(network, `explorer/home?${params.toString()}`),
      options,
    );
    const data = payload?.data || null;
    if (!data) {
      explorerHomeUnavailableUntilByNetwork.set(network, Date.now() + EXPLORER_HOME_UNAVAILABLE_RETRY_MS);
      return null;
    }
    explorerHomeUnavailableUntilByNetwork.delete(network);
    return data;
  },

  async getSummary(options = {}) {
    const network = resolveIndexerNetworkPath(options);

    // Result cache (skipped when caller explicitly asked for fresh data).
    if (!options?.forceRefresh) {
      const cached = _summaryCache.get(network);
      if (cached && Date.now() - cached.t < SUMMARY_CACHE_TTL_MS) {
        return cached.data;
      }
    }

    const inflight = _inflightGetSummary.get(network);
    if (inflight) return inflight;

    const promise = (async () => {
      const hotPaths = shouldUseHotIndexerSelection({ pathType: "summary", ...options })
        ? await buildHotIndexerPaths(network, "summary", options)
        : buildIndexerFallbackPaths(network, "summary");
      const payload = await fetchIndexerJsonWithFallback(
        hotPaths,
        options,
      );
      const data = payload?.data || null;
      if (data) _summaryCache.set(network, { t: Date.now(), data });
      return data;
    })().finally(() => {
      _inflightGetSummary.delete(network);
    });

    _inflightGetSummary.set(network, promise);
    return promise;
  },

  async getBlocks(limit = 20, offset = 0, options = {}) {
    const network = resolveIndexerNetworkPath(options);
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
    const network = resolveIndexerNetworkPath(options);
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

  // Per-contract notifications stream (events). The legacy
  // GetNotificationByContractHash RPC returns empty for many contracts;
  // the indexer's REST endpoint is authoritative.
  async getContractNotifications(contractHash, limit = 20, offset = 0, options = {}) {
    const network = resolveIndexerNetworkPath(options);
    const safe = encodeURIComponent(String(contractHash || "").trim());
    if (!safe) return null;
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return await fetchIndexerJsonWithFallback(
      buildIndexerFallbackPaths(network, `contracts/${safe}/notifications?${params.toString()}`),
      options,
    );
  },

  async getContractCalls(contractHash, limit = 20, offset = 0, options = {}) {
    const network = resolveIndexerNetworkPath(options);
    const safe = encodeURIComponent(String(contractHash || "").trim());
    if (!safe) return null;
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return await fetchIndexerJsonWithFallback(
      buildIndexerFallbackPaths(network, `contracts/${safe}/calls?${params.toString()}`),
      options,
    );
  },

  async getTokenHolders(contractHash, limit = 20, offset = 0, options = {}) {
    const network = resolveIndexerNetworkPath(options);
    const safe = encodeURIComponent(String(contractHash || "").trim());
    if (!safe) return null;
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    return await fetchIndexerJsonWithFallback(
      buildIndexerFallbackPaths(network, `tokens/${safe}/holders?${params.toString()}`),
      options,
    );
  },

  async getCandidateVoters(publicKey, limit = 20, offset = 0, options = {}) {
    const network = resolveIndexerNetworkPath(options);
    const pk = String(publicKey || "").trim();
    if (!pk) return null;
    const params = new URLSearchParams({ candidate: pk, limit: String(limit), offset: String(offset) });
    return await fetchIndexerJsonWithFallback(
      buildIndexerFallbackPaths(network, `governance/voters?${params.toString()}`),
      options,
    );
  },

  // Per-account transaction list. The legacy GetRawTransactionByAddress
  // RPC also returns empty for active wallets; the indexer is the only
  // reliable source. Returns the raw `{ data, paging }` payload so the
  // caller can derive totalCount from `paging.total`.
  async getAccountTransactions(address, limit = 20, offset = 0, options = {}) {
    const network = resolveIndexerNetworkPath(options);
    const safe = encodeURIComponent(String(address || "").trim());
    if (!safe) return null;
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return await fetchIndexerJsonWithFallback(
      buildIndexerFallbackPaths(network, `accounts/${safe}/transactions?${params.toString()}`),
      options,
    );
  },

  // Per-contract overview row: { tx_count, last_call_ms, ... }. The
  // ContractDetail page reads this from two distinct mount paths (the
  // page header + ScCallTable's overviewPromise), so concurrent calls
  // get coalesced into one fetch.
  async getContractOverview(hash, options = {}) {
    const network = resolveIndexerNetworkPath(options);
    const safe = encodeURIComponent(String(hash || "").trim());
    if (!safe) return null;

    const key = `${network}:${safe}`;
    const inflight = _inflightGetContractOverview.get(key);
    if (inflight) return inflight;

    // Defensive cap: keys are user-supplied (contract hashes); a request that
    // never settles (no abort) would otherwise leak. Clear the map if it grows
    // abnormally; entries self-clean on settle so this only catches leaks.
    if (_inflightGetContractOverview.size > 256) {
      _inflightGetContractOverview.clear();
    }

    const promise = (async () => {
      const payload = await fetchIndexerJsonWithFallback(
        buildIndexerFallbackPaths(network, `contracts/${safe}`),
        options,
      );
      return payload?.data || null;
    })().finally(() => {
      _inflightGetContractOverview.delete(key);
    });

    _inflightGetContractOverview.set(key, promise);
    return promise;
  },

  async getContracts(limit = 20, offset = 0, { search = "", ...options } = {}) {
    const network = resolveIndexerNetworkPath(options);
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
    const network = resolveIndexerNetworkPath(options);
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

  async search(query, { type = "", limit = 10, ...options } = {}) {
    const network = resolveIndexerNetworkPath(options);
    const trimmed = String(query || "").trim();
    if (!trimmed) return null;

    const params = new URLSearchParams({
      q: trimmed,
      limit: String(limit),
    });
    if (String(type || "").trim()) {
      params.set("type", String(type).trim());
    }

    const payload = await fetchIndexerJsonWithFallback(
      buildIndexerFallbackPaths(network, `search?${params.toString()}`),
      options,
    );
    return payload?.data || null;
  },

  async getToken(contractHash, options = {}) {
    const network = resolveIndexerNetworkPath(options);
    if (!contractHash) return null;

    const { standard = "" } = options || {};
    const fetchOptions = { ...(options || {}) };
    delete fetchOptions.standard;
    delete fetchOptions.network;
    const isNep11 = String(standard || "")
      .trim()
      .toUpperCase() === "NEP11";
    const findNep11Token = async () => {
      // The single-token endpoint is NEP-17-only on the indexer side
      // (GetTokenOverview gates on nep17_transfers). For NEP-11 contracts it
      // returns 404; when the caller already knows the standard, skip that
      // noisy request and fetch the compact NEP-11 catalog directly.
      const list = await fetchIndexerJsonWithFallback(
        buildIndexerFallbackPaths(network, `tokens?standard=NEP11&limit=200`),
        fetchOptions,
      );
      const target = String(contractHash).toLowerCase();
      return (list?.data || []).find(
        (r) => String(r.contract_hash || "").toLowerCase() === target,
      ) || null;
    };

    if (isNep11) {
      return findNep11Token();
    }

    const payload = await fetchIndexerJsonWithFallback(
      buildIndexerFallbackPaths(network, `tokens/${encodeURIComponent(String(contractHash || "").trim())}`),
      fetchOptions,
    );
    if (payload?.data && !Array.isArray(payload.data)) return payload.data;
    return findNep11Token();
  },

  async getDailyAnalytics(days = 30, options = {}) {
    const network = resolveIndexerNetworkPath(options);
    const params = new URLSearchParams({
      days: String(days),
    });
    const payload = await fetchIndexerJsonWithFallback(
      buildIndexerFallbackPaths(network, `analytics/daily?${params.toString()}`),
      options,
    );
    return Array.isArray(payload?.data) ? payload.data : [];
  },

  // Most-recent transactions across the network. Use this when blocks are
  // sparse (Neo N3 produces empty blocks every ~15s during low traffic) and
  // you need a populated fee distribution.
  async getRecentTransactions(limit = 20, offset = 0, options = {}) {
    const network = resolveIndexerNetworkPath(options);
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    const payload = await fetchIndexerJsonWithFallback(
      buildIndexerFallbackPaths(network, `transactions?${params.toString()}`),
      options,
    );
    return Array.isArray(payload?.data) ? payload.data : [];
  },
};

export default indexerReadService;
