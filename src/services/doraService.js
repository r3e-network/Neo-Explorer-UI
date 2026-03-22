/**
 * Dora API Service — Unified access to Dora committee/candidate data
 * @module services/doraService
 * @description Consolidates all Dora API calls behind cached, deduplicated methods.
 *              Replaces 6+ inline fetch() calls scattered across views/composables.
 */

import { cachedRequest } from "./cache";
import { getDoraCommitteeUrl, getDoraCommitteeCacheKey } from "@/utils/dora";
import { getCurrentEnv, NET_ENV } from "@/utils/env";

/** Dora committee data TTL — 5 minutes (matches all prior usages) */
const DORA_TTL = 300_000;

/**
 * Check whether the current (or given) environment is testnet.
 * @param {string} [env] - Environment string; defaults to getCurrentEnv()
 * @returns {boolean}
 */
function isTestnetEnv(env) {
  const normalized = (env || getCurrentEnv()).toLowerCase();
  return normalized.includes(NET_ENV.TestT5.toLowerCase()) || normalized.includes("test");
}

/**
 * Fetch Dora committee/candidate metadata with caching.
 * Returns an empty array on testnet or on any network error.
 *
 * All 6 previous call-sites used identical logic:
 *   cachedRequest(cacheKey, () => fetch(url).then(r => r.ok ? r.json() : []), 300000)
 *
 * @param {string} [network=NET_ENV.Mainnet] - Network environment
 * @returns {Promise<Array>} Committee candidate array (or [])
 */
export async function getCommittee(network = NET_ENV.Mainnet) {
  if (isTestnetEnv(network)) return [];

  const url = getDoraCommitteeUrl(network);
  const cacheKey = getDoraCommitteeCacheKey(network);

  return cachedRequest(cacheKey, () => fetch(url).then((r) => (r.ok ? r.json() : [])), DORA_TTL);
}

/**
 * Fetch node liveness data from the backend proxy.
 * Previously inlined in Governance.vue (line 507).
 *
 * @param {string} [doraEnv] - "mainnet" or "testnet"; auto-detected if omitted
 * @returns {Promise<Object>} Map of nodeIndex -> liveness entry (or {})
 */
export async function getLiveness(doraEnv) {
  const env = doraEnv || (isTestnetEnv() ? "testnet" : "mainnet");

  const cacheKey = `dora_liveness_${env}`;

  try {
    const data = await cachedRequest(
      cacheKey,
      () => fetch(`/api/liveness?network=${env}`).then((r) => r.json()),
      DORA_TTL,
    );

    if (data && data.success && Array.isArray(data.liveness)) {
      const map = {};
      data.liveness.forEach((l) => {
        map[l.nodeIndex] = l;
      });
      return map;
    }
    return {};
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[doraService] Failed to fetch liveness data", e);
    return {};
  }
}

export default {
  getCommittee,
  getLiveness,
};
