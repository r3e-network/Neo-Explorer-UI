import { getCurrentEnv, NET_ENV } from "@/utils/env";

function isTestnetEnv() {
  return getCurrentEnv() === NET_ENV.TestT5;
}

// Public network-health data from the official NGD Neo Monitor at
// https://monitor.ngd.network/. The same APIs power that site's UI;
// we proxy them through the browser since the endpoints set permissive
// CORS headers.
const NGD_BASE = "https://monitor.ngd.network/api";
const FETCH_TIMEOUT_MS = 8000;

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
 * @returns {Promise<Array<{height:number,time:number,interval:number,tx:number}>>}
 */
export async function getLatestBlocks(env) {
  const slug = networkSlug(env);
  const cacheKey = `latest:${slug}`;
  const cached = getCached(cacheKey, CACHE_TTL_MS.latest);
  if (cached) return cached;

  try {
    const data = await fetchJsonWithTimeout(`${NGD_BASE}/${slug}/latest`);
    const rows = Array.isArray(data) ? data : [];
    setCached(cacheKey, rows);
    return rows;
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
