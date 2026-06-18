import { recordApiObservationFromResponse, getRecentApiObservations } from "@/telemetry/apiObservability";
import { resolveNetworkName } from "@/utils/env";
import { getIndexerBaseUrls } from "@/services/indexerReadService";

const STATUS_TIMEOUT_MS = 3000;
const STATUS_CACHE_TTL_MS = 5000;
const statusCache = new Map();

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeString(value) {
  return String(value || "").trim();
}

function normalizeNetwork(network) {
  return resolveNetworkName(network || undefined);
}

function endpointUrls(network, suffix) {
  return getIndexerBaseUrls(network)
    .map((baseUrl) => `${String(baseUrl || "").replace(/\/+$/, "")}/${suffix.replace(/^\/+/, "")}`)
    .filter(Boolean);
}

function withCacheBusting(url, forceRefresh) {
  if (!forceRefresh) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}_ts=${Date.now()}`;
}

async function fetchJsonWithObservation(url, { forceRefresh = false, timeoutMs = STATUS_TIMEOUT_MS } = {}) {
  if (typeof fetch !== "function") {
    return { data: null, observation: null, error: "fetch_unavailable", url };
  }

  const requestUrl = withCacheBusting(url, forceRefresh);
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const headers = { Accept: "application/json" };
  if (forceRefresh && !/^https?:\/\//i.test(requestUrl)) {
    headers["Cache-Control"] = "no-cache";
    headers.Pragma = "no-cache";
  }

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      headers,
      ...(forceRefresh ? { cache: "no-store" } : {}),
      signal: controller?.signal,
    });
    const observation = recordApiObservationFromResponse(response, requestUrl, {
      method: "GET",
      source: "indexer-status",
    });
    if (!response.ok) {
      return { data: null, observation, error: `http_${response.status}`, status: response.status, url: requestUrl };
    }
    const payload = await response.json();
    return {
      data: payload?.data || payload || null,
      observation,
      status: response.status,
      url: requestUrl,
    };
  } catch (err) {
    return {
      data: null,
      observation: null,
      error: err?.name === "AbortError" ? "timeout" : "network_error",
      url: requestUrl,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function fetchFirstHealthy(network, suffix, options = {}) {
  const urls = endpointUrls(network, suffix);
  let lastResult = { data: null, observation: null, error: "no_endpoint", url: "" };

  for (const url of urls) {
    const result = await fetchJsonWithObservation(url, options);
    lastResult = result;
    if (result.data) return result;
  }

  return lastResult;
}

export function normalizeIndexerStatus(rawStatus = {}, network = resolveNetworkName()) {
  const data = rawStatus || {};
  const lastIndexedBlock = normalizeNumber(data.last_indexed_block ?? data.lastIndexedBlock, -1);
  const chainTipBlock = normalizeNumber(data.chain_tip_block ?? data.chainTipBlock, lastIndexedBlock);
  const lagBlocks = normalizeNumber(
    data.lag_blocks ?? data.lagBlocks,
    chainTipBlock >= 0 && lastIndexedBlock >= 0 ? Math.max(0, chainTipBlock - lastIndexedBlock) : 0,
  );
  const freshnessSeconds = normalizeNumber(data.freshness_seconds ?? data.freshnessSeconds, 0);
  const maxFreshnessSeconds = normalizeNumber(data.max_freshness_seconds ?? data.maxFreshnessSeconds, 300);
  const explicitReady = typeof data.ready === "boolean" ? data.ready : null;
  const inferredReady = lastIndexedBlock >= 0 && freshnessSeconds <= maxFreshnessSeconds;
  const ready = explicitReady ?? inferredReady;
  const reason = normalizeString(data.reason) || (ready ? "ok" : lastIndexedBlock < 0 ? "not_indexed" : "indexer_stale");
  const syncRatio =
    chainTipBlock > 0 && lastIndexedBlock >= 0
      ? Math.max(0, Math.min(1, lastIndexedBlock / chainTipBlock))
      : 0;

  return {
    network: normalizeString(data.network) || normalizeNetwork(network),
    ready,
    reason,
    lastIndexedBlock,
    chainTipBlock,
    lagBlocks,
    freshnessSeconds,
    maxFreshnessSeconds,
    updatedAt: normalizeString(data.updated_at ?? data.updatedAt),
    checkedAt: normalizeString(data.checked_at ?? data.checkedAt),
    syncRatio,
  };
}

export function normalizeIndexerSummary(rawSummary = {}, network = resolveNetworkName()) {
  const data = rawSummary || {};
  return {
    network: normalizeString(data.network) || normalizeNetwork(network),
    indexedTxCount: normalizeNumber(data.indexed_tx_count ?? data.indexedTxCount, 0),
    totalBlockCount: normalizeNumber(data.total_block_count ?? data.totalBlockCount, 0),
    totalTxCount: normalizeNumber(data.total_tx_count ?? data.totalTxCount, 0),
    totalAddressCount: normalizeNumber(data.total_address_count ?? data.totalAddressCount, 0),
    activeAddressCount7d: normalizeNumber(data.active_address_count_7d ?? data.activeAddressCount7d, 0),
    dailyTxCount: normalizeNumber(data.daily_tx_count ?? data.dailyTxCount, 0),
    summarySource: normalizeString(data.summary_source ?? data.summarySource),
    summarySourceUpdatedAt: normalizeString(data.summary_source_updated_at ?? data.summarySourceUpdatedAt),
  };
}

export function getRecentIndexerObservations(network = resolveNetworkName(), limit = 6) {
  const net = normalizeNetwork(network);
  return getRecentApiObservations()
    .filter((item) => {
      const source = normalizeString(item.source);
      const url = normalizeString(item.url);
      return source.includes("indexer") && (url.includes(`/data/${net}/`) || url.includes(`/${net}/`));
    })
    .slice(-limit)
    .reverse();
}

export async function getIndexerHealthSnapshot(network = resolveNetworkName(), options = {}) {
  const net = normalizeNetwork(network);
  const cacheKey = net;
  if (!options.forceRefresh) {
    const cached = statusCache.get(cacheKey);
    if (cached && Date.now() - cached.ts <= STATUS_CACHE_TTL_MS) {
      return cached.value;
    }
  }

  const [statusResult, summaryResult] = await Promise.all([
    fetchFirstHealthy(net, "status", options),
    fetchFirstHealthy(net, "summary", options),
  ]);

  const status = normalizeIndexerStatus(statusResult.data || summaryResult.data || {}, net);
  const summary = normalizeIndexerSummary(summaryResult.data || {}, net);
  const observations = [statusResult.observation, summaryResult.observation]
    .filter(Boolean)
    .concat(getRecentIndexerObservations(net, 4))
    .filter((item, index, items) => {
      const key = `${item.timestamp || ""}:${item.url || ""}:${item.requestId || ""}`;
      return items.findIndex((candidate) => `${candidate.timestamp || ""}:${candidate.url || ""}:${candidate.requestId || ""}` === key) === index;
    })
    .slice(0, 6);

  const value = {
    network: net,
    status,
    summary,
    observations,
    primaryObservation: statusResult.observation || summaryResult.observation || observations[0] || null,
    statusError: statusResult.error || "",
    summaryError: summaryResult.error || "",
    checkedAt: new Date().toISOString(),
  };

  if (statusResult.data || summaryResult.data) {
    statusCache.set(cacheKey, { ts: Date.now(), value });
  }
  return value;
}

export function __resetIndexerStatusServiceForTests() {
  statusCache.clear();
}
