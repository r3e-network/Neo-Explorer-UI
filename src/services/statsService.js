import { rpc } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { createService } from "./serviceFactory";
import { getRealtimeListCacheOptions } from "./serviceFactory";
import { indexerReadService } from "./indexerReadService";
import { transactionService } from "./transactionService";
import { resolveNetworkName } from "@/utils/env";

/**
 * Stats Service - 仪表盘统计数据
 * @module services/statsService
 * @description 通过 neo3fura 获取网络统计信息，带缓存支持
 */

const NETWORK_FEE_RATIO = 0.08;
const INDEXER_STATS_TIMEOUT_MS = 2500;

const normalizeStatsOptions = (value = {}) => {
  if (typeof value === "boolean") return { forceRefresh: value };
  return { ...(value || {}) };
};

const withNetworkOption = (options = {}) => {
  const network = options?.network ? resolveNetworkName(options.network) : null;
  return network ? { network } : undefined;
};

const resolveIndexerNetworkPath = (options = {}) => {
  const explicitNetwork = typeof options === "string" ? options : options?.network;
  return explicitNetwork ? resolveNetworkName(explicitNetwork) : resolveNetworkName();
};

const fetchIndexerTransactionTotal = async (options = {}) => {
  if (typeof fetch !== "function") return 0;

  const network = resolveIndexerNetworkPath(options);
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  let timeoutId = null;

  try {
    if (controller) {
      timeoutId = setTimeout(() => controller.abort(), INDEXER_STATS_TIMEOUT_MS);
    }

    const res = await fetch(`/indexer/${network}/transactions?limit=1&offset=0`, {
      method: "GET",
      signal: controller?.signal,
    });

    if (!res.ok) return 0;
    const payload = await res.json();
    const total = Number(payload?.paging?.total ?? payload?.total ?? 0);
    return Number.isFinite(total) && total > 0 ? total : 0;
  } catch (_err) {
    return 0;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

/**
 * Calculate estimated network fee from GAS price.
 * @param {number} gasPrice - Current GAS price in USD
 * @returns {number} Estimated network fee (floored to 3 decimals)
 */
export function calculateNetworkFee(gasPrice) {
  return Number(Math.max(0, (gasPrice || 0) * NETWORK_FEE_RATIO).toFixed(3));
}

// Pad indexer rows to exactly `days` consecutive UTC days ending today, oldest-first.
// Missing days (gaps in the indexer) become zero-valued rows so charts render evenly.
function padDailyRows(rows, days, now = new Date()) {
  const byDay = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const day = String(row?.day || "").trim();
    if (day) byDay.set(day, row);
  }
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() - (days - i - 1));
    const day = date.toISOString().slice(0, 10);
    return (
      byDay.get(day) || {
        day,
        tx_count: 0,
        active_signers: 0,
        fee_burned: "0",
        nep17_transfer_count: 0,
        nep11_transfer_count: 0,
      }
    );
  });
}

export const statsService = createService(
  {},
  {
    /**
     * Daily analytics rows from the indexer, padded to exactly `days` UTC days.
     * One row per day with: tx_count, active_signers, fee_burned (fractoshi),
     * nep17_transfer_count, nep11_transfer_count. Throws on indexer failure
     * so the UI can show an error state instead of silent zeros.
     */
    async getDailyAnalytics(days = 30, options = {}) {
      const cacheOpts = getRealtimeListCacheOptions(options);
      const key = getCacheKey("daily_analytics_padded", { days }, cacheOpts.network);
      return cachedRequest(
        key,
        async () => {
          const rows = await indexerReadService.getDailyAnalytics(days, options);
          if (!Array.isArray(rows) || rows.length === 0) {
            throw new Error("Daily analytics unavailable");
          }
          return padDailyRows(rows, days);
        },
        CACHE_TTL.chart,
        cacheOpts,
      );
    },

    /** [{date, transactions}] — kept stable for BurnFee.vue. */
    async getNetworkActivity(days = 30, options = {}) {
      const rows = await this.getDailyAnalytics(days, options);
      return rows.map((r) => ({ date: r.day, transactions: Number(r.tx_count) || 0 }));
    },

    async getDashboardStats(optionsOrForceRefresh = false) {
      const options = normalizeStatsOptions(optionsOrForceRefresh);
      const cacheOpts = getRealtimeListCacheOptions(options);
      const key = getCacheKey("dashboard_stats", {}, cacheOpts.network);

      const fetchFn = async () => {
        try {
          // Indexer summary has total_*_count for everything we render.
          // Previously fired 4 parallel PascalCase Mongo POSTs as
          // "fallback" — all empty or redundant per #184. Standard
          // getblockcount is the only chain-side fallback we keep
          // (works against any Neo node, outlives Mongo cleanup).
          const summary = await indexerReadService.getSummary(cacheOpts).catch(() => null);

          let blocks = Number(summary?.total_block_count) || 0;
          if (blocks === 0) {
            const rpcOptions = withNetworkOption(cacheOpts) || { network: resolveNetworkName() };
            const blockCountRes = await rpc("getblockcount", [], rpcOptions).catch(() => null);
            blocks = Number(blockCountRes) || 0;
          }

          const txsFromSummary = Number(summary?.total_tx_count) || 0;
          const txsFromIndexerStats = Number(await fetchIndexerTransactionTotal(cacheOpts).catch(() => 0)) || 0;
          const txs = Math.max(txsFromSummary, txsFromIndexerStats);

          const result = {
            blocks,
            txs,
            contracts: Number(summary?.total_contract_count) || 0,
            candidates: Number(summary?.total_candidate_count) || 0,
            addresses: Number(summary?.total_address_count) || 0,
            tokens: Number(summary?.total_asset_count) || 0,
          };

          return result;
        } catch (error) {
          if (import.meta.env.DEV) console.error("Failed to get dashboard stats:", error);
          throw error;
        }
      };

      return cachedRequest(key, fetchFn, CACHE_TTL.chart, cacheOpts);
    },

    /**
     * 获取 Gas 追踪数据（最新手续费 + 网络费用）
     * Aggregates 2 parallel RPC calls — cannot be expressed as a single factory config.
     * @param {boolean|Object} [optionsOrForceRefresh=false] - 强制刷新或请求选项
     * @returns {Promise<Object>} Gas 追踪数据
     */
    async getGasTracker(optionsOrForceRefresh = false) {
      const options = normalizeStatsOptions(optionsOrForceRefresh);
      const cacheOpts = getRealtimeListCacheOptions(options);
      const key = getCacheKey("gas_tracker", {}, cacheOpts.network);
      return cachedRequest(
        key,
        async () => {
          try {
            // Route through transactionService.getList (#171 — indexer-first
            // with legacy GetTransactionList as fallback). The legacy raw
            // RPC path returns empty post-Mongo-deletion.
            const requestOptions = { forceRefresh: Boolean(options.forceRefresh) };
            if (cacheOpts.network) requestOptions.network = cacheOpts.network;
            const txListRes = await transactionService.getList(1, 0, requestOptions).catch(() => null);
            const latestTx = Array.isArray(txListRes?.result) ? txListRes.result[0] : null;

            return {
              latestNetworkFee: latestTx?.netfee ?? latestTx?.net_fee ?? "0",
              latestSystemFee: latestTx?.sysfee ?? latestTx?.sys_fee ?? "0",
              networkFee: null,
            };
          } catch (error) {
            if (import.meta.env.DEV) console.error("Failed to get gas tracker:", error);
            return { latestNetworkFee: "0", latestSystemFee: "0", networkFee: null };
          }
        },
        CACHE_TTL.chart,
        cacheOpts,
      );
    },
  }
);

export default statsService;
