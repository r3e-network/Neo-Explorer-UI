// Neo X stats service — normalizes the Blockscout /stats payload for the
// home overview and list headline counts.

import { fetchBlockscout } from "./blockscoutClient";
import { getNeoxNet } from "@/utils/neoxEnv";

const netOf = (opts) => (typeof opts === "string" ? opts : opts?.net) || getNeoxNet();

function toNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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
