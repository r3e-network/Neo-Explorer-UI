// Neo X stats service — normalizes the Blockscout /stats payload for the
// home overview and list headline counts, plus the standalone stats
// microservice (charts + counters) behind the /neox-stats proxy.

import { SourceUnavailableError } from "@/adapters/source";
import { fetchBlockscout } from "./blockscoutClient";
import { getNeoxNet, resolveNeoxNetName } from "@/utils/neoxEnv";

const netOf = (opts) => (typeof opts === "string" ? opts : opts?.net) || getNeoxNet();

const STATS_TIMEOUT_MS = 8000;

function toNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// Local transport for the stats microservice. Mirrors blockscoutClient's
// fetch/timeout/error conventions but targets the /neox-stats/<net> proxy
// prefix (api/neox-stats/[...path].js in prod, vite server.proxy in dev), so
// it cannot reuse fetchBlockscout, whose prefix is /neox/<net>.
async function fetchNeoxStats(net, path, { params = {}, signal, timeoutMs = STATS_TIMEOUT_MS } = {}) {
  const cleanPath = String(path || "").replace(/^\/+/, "");
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === "") continue;
    search.append(key, String(value));
  }
  const qs = search.toString();
  const url = `/neox-stats/${resolveNeoxNetName(net)}/${cleanPath}${qs ? `?${qs}` : ""}`;

  const controller = new AbortController();
  const timer = signal ? null : setTimeout(() => controller.abort(), timeoutMs);
  const activeSignal = signal || controller.signal;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: activeSignal,
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new SourceUnavailableError(`Neo X stats responded ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof SourceUnavailableError) throw error;
    if (error?.name === "AbortError") {
      throw new SourceUnavailableError("Neo X stats request timed out");
    }
    throw new SourceUnavailableError(error?.message || "Neo X stats request failed");
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Normalize one /lines/{id} payload into ascending [{ date, value }] points.
// Upstream values are numeric strings; rows with a missing date or a
// non-finite value are dropped rather than rendered as zero.
function normalizeChartLine(raw) {
  const rows = Array.isArray(raw?.chart) ? raw.chart : [];
  return rows
    .filter((row) => row && typeof row.date === "string" && row.date && row.value !== null && row.value !== undefined)
    .map((row) => ({ date: row.date, value: Number(row.value) }))
    .filter((point) => Number.isFinite(point.value))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * @typedef {Object} NeoxStats
 * @property {number} totalBlocks
 * @property {number} totalTransactions
 * @property {number} totalAddresses
 * @property {number} averageBlockTimeMs
 * @property {Object|null} gasPrices - { slow, average, fast }
 * @property {number} transactionsToday
 * @property {string|null} coinPrice
 * @property {string|null} marketCap
 * @property {number} networkUtilizationPct
 * @property {Object} raw
 */

function normalizeStats(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    totalBlocks: toNum(raw.total_blocks),
    totalTransactions: toNum(raw.total_transactions),
    totalAddresses: toNum(raw.total_addresses),
    averageBlockTimeMs: toNum(raw.average_block_time),
    gasPrices: raw.gas_prices ?? null,
    transactionsToday: toNum(raw.transactions_today),
    gasUsedToday: raw.gas_used_today ?? null,
    coinPrice: raw.coin_price ?? null,
    marketCap: raw.market_cap ?? null,
    networkUtilizationPct: toNum(raw.network_utilization_percentage),
    raw,
  };
}

export const statsService = {
  /** Normalized network stats. Returns null when unavailable. */
  async getStats(opts = {}) {
    const data = await fetchBlockscout(netOf(opts), "stats", { signal: opts.signal });
    return normalizeStats(data);
  },

  /** Daily transaction chart points: [{ date: "YYYY-MM-DD", transactions_count }]. */
  async getTxChart(opts = {}) {
    const data = await fetchBlockscout(netOf(opts), "stats/charts/transactions", { signal: opts.signal });
    return Array.isArray(data?.chart_data) ? data.chart_data : [];
  },

  /**
   * Daily points for one stats-microservice chart line (e.g. "newTxns",
   * "averageGasPrice"). Returns an ascending [{ date: "YYYY-MM-DD",
   * value: Number }] array; unknown chart ids resolve to [].
   */
  async getChartLine(id, opts = {}) {
    const data = await fetchNeoxStats(netOf(opts), `lines/${encodeURIComponent(String(id || ""))}`, {
      params: { resolution: "DAY", from: opts.from, to: opts.to },
      signal: opts.signal,
    });
    return normalizeChartLine(data);
  },

  /** Chart catalog: [{ id, title, charts: [{ id, title, ... }] }] sections. */
  async getChartsCatalog(opts = {}) {
    const data = await fetchNeoxStats(netOf(opts), "lines", { signal: opts.signal });
    return Array.isArray(data?.sections) ? data.sections : [];
  },

  /** Headline counters: [{ id, value, title, units, description }]. */
  async getCountersList(opts = {}) {
    const data = await fetchNeoxStats(netOf(opts), "counters", { signal: opts.signal });
    return Array.isArray(data?.counters) ? data.counters : [];
  },

  /** Indexer progress, for a "still syncing" banner. Returns null when unavailable. */
  async getIndexingStatus(opts = {}) {
    const data = await fetchBlockscout(netOf(opts), "main-page/indexing-status", { signal: opts.signal });
    if (!data || typeof data !== "object") return null;
    return {
      finishedIndexing: Boolean(data.finished_indexing),
      finishedIndexingBlocks: Boolean(data.finished_indexing_blocks),
      indexedBlocksRatio: data.indexed_blocks_ratio ?? null,
      indexedInternalTransactionsRatio: data.indexed_internal_transactions_ratio ?? null,
      raw: data,
    };
  },
};

export default statsService;
