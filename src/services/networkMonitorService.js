import { getCurrentEnv, NET_ENV } from "@/utils/env";
import { indexerReadService } from "@/services/indexerReadService";

function isTestnetEnv() {
  return getCurrentEnv() === NET_ENV.TestT5;
}

// Public network-health data from the official NGD Neo Monitor at
// https://monitor.ngd.network/. The same APIs power that site's UI;
// we proxy them through the browser since the endpoints set permissive
// CORS headers.
const NGD_BASE = "https://monitor.ngd.network/api";
const FETCH_TIMEOUT_MS = 8000;
const INDEXER_BLOCK_LOOKBACK = 140;

const CACHE_TTL_MS = {
  seeds: 30 * 1000,
  latest: 15 * 1000,
  history: 60 * 1000,
};
const cache = new Map();

function getCached(key, ttl) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttl) return null;
  return entry.data;
}

function setCached(key, data) {
  cache.set(key, { ts: Date.now(), data });
}

function networkSlug(env) {
  // Monitor uses N3main / N3test; mirror the same labels for consistency.
  if (env === "testnet" || (env == null && isTestnetEnv())) return "N3test";
  return "N3main";
}

function normalizePrimaryNode(value) {
  const primary = Number(value);
  return Number.isFinite(primary) && primary >= 0 ? primary : null;
}

async function enrichBlocksWithIndexerConsensus(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;

  try {
    const limit = Math.max(INDEXER_BLOCK_LOOKBACK, rows.length + 40);
    const payload = await indexerReadService.getBlocks(limit, 0, {
      forceRefresh: true,
      timeoutMs: 2500,
    });
    const indexerRows = Array.isArray(payload?.data) ? payload.data : [];
    if (indexerRows.length === 0) return rows;

    const byHeight = new Map(
      indexerRows
        .map((block) => [Number(block?.block_index ?? block?.index ?? block?.height), block])
        .filter(([height]) => Number.isFinite(height)),
    );

    return rows.map((row) => {
      const height = Number(row?.height);
      const block = byHeight.get(height);
      if (!block) return row;
      const primaryNode = normalizePrimaryNode(block.primary_node ?? block.primary ?? block.primaryNode);
      return {
        ...row,
        blockHash: block.hash ?? row.blockHash,
        primaryNode,
        primary_node: primaryNode,
        nextConsensus: block.next_consensus ?? block.nextconsensus ?? block.nextConsensus ?? row.nextConsensus,
        next_consensus: block.next_consensus ?? block.nextconsensus ?? block.nextConsensus ?? row.next_consensus,
      };
    });
  } catch (err) {
    if (import.meta.env.DEV) console.warn("[networkMonitor] consensus enrichment failed:", err);
    return rows;
  }
}

async function fetchJsonWithTimeout(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller?.signal,
    });
    if (!res.ok) throw new Error(`monitor fetch ${res.status}`);
    return await res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Seed-node health: endpoint, current height, version, latency (ms).
 * @param {"mainnet"|"testnet"} [env]
 * @returns {Promise<Array<{endpoint:string,height:number,version:string,latency:number}>>}
 */
export async function getSeeds(env) {
  const slug = networkSlug(env);
  const cacheKey = `seeds:${slug}`;
  const cached = getCached(cacheKey, CACHE_TTL_MS.seeds);
  if (cached) return cached;

  try {
    const data = await fetchJsonWithTimeout(`${NGD_BASE}/${slug}/seeds`);
    const rows = Array.isArray(data) ? data : [];
    setCached(cacheKey, rows);
    return rows;
  } catch (err) {
    if (import.meta.env.DEV) console.warn("[networkMonitor] seeds fetch failed:", err);
    return [];
  }
}

/**
 * Latest ~70 blocks with height/time/interval/tx for charting block-time
 * and block-transaction trends.
 * @param {"mainnet"|"testnet"} [env]
 * @returns {Promise<Array<{height:number,time:number,interval:number,tx:number,primaryNode?:number,nextConsensus?:string}>>}
 */
export async function getLatestBlocks(env) {
  const slug = networkSlug(env);
  const cacheKey = `latest:${slug}`;
  const cached = getCached(cacheKey, CACHE_TTL_MS.latest);
  if (cached) return cached;

  try {
    const data = await fetchJsonWithTimeout(`${NGD_BASE}/${slug}/latest`);
    const rows = Array.isArray(data) ? data : [];
    const enrichedRows = await enrichBlocksWithIndexerConsensus(rows);
    setCached(cacheKey, enrichedRows);
    return enrichedRows;
  } catch (err) {
    if (import.meta.env.DEV) console.warn("[networkMonitor] latest fetch failed:", err);
    return [];
  }
}

/**
 * Aggregate signal that gives the homepage a tiny "All N seeds online"
 * indicator without rendering the full page. Counts seeds within
 * `staleHeightWindow` of the network tip as healthy.
 */
export async function getNetworkHealth(env, staleHeightWindow = 2) {
  const seeds = await getSeeds(env);
  if (!seeds.length) return { online: 0, total: 0, tip: 0, healthy: false };
  const tip = seeds.reduce((max, s) => Math.max(max, Number(s.height) || 0), 0);
  const online = seeds.filter((s) => tip > 0 && tip - Number(s.height || 0) <= staleHeightWindow).length;
  return {
    online,
    total: seeds.length,
    tip,
    healthy: online === seeds.length,
    seeds,
  };
}
