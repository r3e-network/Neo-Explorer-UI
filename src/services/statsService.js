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

const normalizeStatsOptions = (value = {}) => {
  if (typeof value === "boolean") return { forceRefresh: value };
  return { ...(value || {}) };
};

const withNetworkOption = (options = {}) => {
  const network = options?.network ? resolveNetworkName(options.network) : null;
  return network ? { network } : undefined;
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
          // Blocks.vue is the only consumer and reads `stats.blocks` only, so
          // this is trimmed to the block-height count. The summary's
          // total_block_count answers directly; the standard getblockcount is
          // the sole chain-side fallback (works against any Neo node, outlives
          // Mongo cleanup). Removed here (#26): the two-LATERAL
          // fetchIndexerTransactionTotal probe (the summary already carries
          // total_tx_count) and the total_contract_count / total_candidate_count
          // reads NetworkSummary never emits (they dead-mapped to 0 behind ||0).
          const summary = await indexerReadService.getSummary(cacheOpts).catch(() => null);

          let blocks = Number(summary?.total_block_count) || 0;
          if (blocks === 0) {
            const rpcOptions = withNetworkOption(cacheOpts) || { network: resolveNetworkName() };
            const blockCountRes = await rpc("getblockcount", [], rpcOptions).catch(() => null);
            blocks = Number(blockCountRes) || 0;
          }

          return { blocks };
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
