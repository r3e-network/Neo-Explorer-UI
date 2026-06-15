import axios from "axios";
import { NET_ENV, getActiveBasePath, getCurrentEnv, setActiveBasePath } from "./env";
import { getRpcEndpointCandidates } from "./rpcEndpoints";

const checkedState = {
  [NET_ENV.Mainnet]: { done: false, lastCheckedAt: 0, inFlight: null },
  [NET_ENV.TestT5]: { done: false, lastCheckedAt: 0, inFlight: null },
};

const EXPECTED_NETWORK_MAGIC = {
  [NET_ENV.Mainnet]: 860833102,
  [NET_ENV.TestT5]: 894710606,
};
const HEALTHCHECK_TIMEOUT_MS = Math.max(500, Number(import.meta.env.VITE_RPC_HEALTHCHECK_TIMEOUT_MS || 4000));
const HEALTHCHECK_RECHECK_INTERVAL_MS = Math.max(
  10_000,
  Number(import.meta.env.VITE_RPC_HEALTHCHECK_RECHECK_MS || 60_000),
);
// After a failed probe we only mark a short backoff window instead of the
// full recheck interval, so an endpoint that recovers can be re-probed
// quickly rather than being blocked for the whole interval.
const HEALTHCHECK_FAILURE_BACKOFF_MS = Math.max(
  1_000,
  Number(import.meta.env.VITE_RPC_HEALTHCHECK_FAILURE_BACKOFF_MS || 5_000),
);
const ENDPOINT_SWITCH_HYSTERESIS_MS = Math.max(
  0,
  Number(import.meta.env.VITE_RPC_ENDPOINT_SWITCH_HYSTERESIS_MS || 1000),
);
const NETWORK_BASE_PATTERN = /\/(api|rpc)\/(mainnet|testnet)(?:\/(primary|fallback(?:2|3)?))?$/i;

const NETWORKS = [
  { env: NET_ENV.Mainnet, prefix: "/rpc/mainnet" },
  { env: NET_ENV.TestT5, prefix: "/rpc/testnet" },
];

const uniqueCandidates = (candidates) => {
  const seen = new Set();
  const out = [];
  for (const candidate of candidates) {
    const normalized = String(candidate || "").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
};

const normalizeCandidatePath = (value) => String(value || "").trim().replace(/\/+$/, "");

const normalizePrimaryAlias = (value) => {
  const normalized = normalizeCandidatePath(value);
  const matched = normalized.match(NETWORK_BASE_PATTERN);
  if (!matched || matched[2]) return normalized;
  return `${normalized}/primary`;
};

const getProbeCandidates = (network) => {
  return uniqueCandidates(getRpcEndpointCandidates(network.env));
};

const readNetworkMagic = async (url) => {
  try {
    const res = await axios.post(
      url,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "getversion",
        params: [],
      },
      { timeout: HEALTHCHECK_TIMEOUT_MS },
    );

    const version = res.data?.result || {};
    const networkMagic = Number(version?.protocol?.network ?? version?.network);
    return Number.isFinite(networkMagic) ? networkMagic : null;
  } catch (_err) {
    return null;
  }
};

const checkEndpointHeight = async (url, expectedNetworkMagic = null) => {
  let start = Date.now();
  try {
    const networkMagic = await readNetworkMagic(url);
    if (
      Number.isFinite(expectedNetworkMagic) &&
      Number.isFinite(networkMagic) &&
      networkMagic !== expectedNetworkMagic
    ) {
      return {
        height: -1,
        latencyMs: Number.POSITIVE_INFINITY,
        networkMagic,
      };
    }

    // Reset the timer so latencyMs measures only the height probe below,
    // not the preceding getversion call (readNetworkMagic).
    start = Date.now();

    // Standard `getblockcount` works against any Neo node and outlives
    // Mongo cleanup. Was previously calling PascalCase GetBlockCount
    // which proxies through neo3fura_http (#184).
    const res = await axios.post(
      url,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "getblockcount",
        params: [],
      },
      { timeout: HEALTHCHECK_TIMEOUT_MS },
    );

    const result = res.data?.result;
    const latencyMs = Date.now() - start;
    // Standard getblockcount returns the integer directly. Keep the
    // object-handling branch as a safety net for the legacy proxy
    // shape `{index: N}` that some backends still emit.
    if (typeof result === "number") {
      return { height: result, latencyMs, networkMagic };
    }
    if (typeof result === "object" && result !== null) {
      return {
        height: Number(result.index || result.count || 0),
        latencyMs,
        networkMagic,
      };
    }
    return {
      height: Number(result || 0),
      latencyMs,
      networkMagic,
    };
  } catch (_e) {
    return {
      height: -1,
      latencyMs: Number.POSITIVE_INFINITY,
      networkMagic: null,
    };
  }
};

const checkNetworkEndpoints = async (network) => {
  if (!network) return;
  const state = checkedState[network.env];
  const now = Date.now();

  // Recheck gate: a successful probe is trusted for the full interval; a
  // failed probe is only suppressed for the short failure backoff so a
  // recovered endpoint is re-probed promptly.
  if (state) {
    const sinceLast = now - state.lastCheckedAt;
    if (state.done && sinceLast < HEALTHCHECK_RECHECK_INTERVAL_MS) return;
    if (!state.done && sinceLast < HEALTHCHECK_FAILURE_BACKOFF_MS) return;
    // Single-flight: coalesce concurrent callers onto the running probe.
    if (state.inFlight) return state.inFlight;
  }

  const runProbe = async () => {
    let succeeded = false;
    try {
      const expectedNetworkMagic = EXPECTED_NETWORK_MAGIC[network.env] ?? null;
      const candidates = getProbeCandidates(network);
      const probeResults = await Promise.all(
        candidates.map(async (candidate) => ({
          basePath: candidate,
          ...(await checkEndpointHeight(candidate, expectedNetworkMagic)),
        })),
      );
      const healthyCandidates = probeResults.filter((candidate) => candidate.height >= 0);
      const current = getActiveBasePath(network.env);
      const normalizedCurrent = normalizePrimaryAlias(current);
      const currentCandidate = healthyCandidates.find(
        (candidate) => normalizePrimaryAlias(candidate.basePath) === normalizedCurrent
      );

      const commitSelection = (path, message) => {
        if (normalizePrimaryAlias(path) === normalizedCurrent) return;
        setActiveBasePath(network.env, path);
        if (import.meta.env.DEV) console.info(message);
      };

      if (healthyCandidates.length > 0) {
        // At least one endpoint answered — this is a successful probe.
        succeeded = true;
        const maxHeight = healthyCandidates.reduce((highest, candidate) => Math.max(highest, candidate.height), -1);
        const freshestCandidates = healthyCandidates.filter((candidate) => candidate.height === maxHeight);
        const fastestFreshCandidate = freshestCandidates.reduce((best, candidate) =>
          candidate.latencyMs < best.latencyMs ? candidate : best
        );

        if (
          currentCandidate &&
          currentCandidate.height === maxHeight &&
          currentCandidate.latencyMs <= fastestFreshCandidate.latencyMs + ENDPOINT_SWITCH_HYSTERESIS_MS
        ) {
          return;
        }

        commitSelection(
          fastestFreshCandidate.basePath,
          `[HealthCheck] ${network.env} using ${fastestFreshCandidate.basePath}. Height=${fastestFreshCandidate.height}, latency=${fastestFreshCandidate.latencyMs}ms`,
        );
        return;
      }

      // Keep current endpoint when both probes fail to avoid forcing a bad primary path.
      if (import.meta.env.DEV && import.meta.env.MODE !== "test") {
        console.warn(`[HealthCheck] ${network.env} both probes failed. Keeping current endpoint: ${current}`);
      }
    } catch (e) {
      if (import.meta.env.DEV && import.meta.env.MODE !== "test") console.warn(`[HealthCheck] Failed for ${network.env}`, e);
    } finally {
      if (state) {
        // Record the attempt time only now that probes have finished, and
        // only mark `done` on success. On failure `done` stays false so the
        // short failure backoff (not the full interval) governs re-probe.
        state.lastCheckedAt = Date.now();
        state.done = succeeded;
      }
    }
  };

  if (state) {
    state.inFlight = runProbe().finally(() => {
      state.inFlight = null;
    });
    return state.inFlight;
  }

  return runProbe();
};

export const checkAndSetEndpoints = async (preferredEnv = getCurrentEnv(), { preloadOtherNetworks = false } = {}) => {
  const preferredNetwork = NETWORKS.find((network) => network.env === preferredEnv) || NETWORKS[0];
  const deferredNetworks = NETWORKS.filter((network) => network.env !== preferredNetwork.env);

  // Resolve only the active network by default to avoid unnecessary cross-network requests.
  await checkNetworkEndpoints(preferredNetwork);

  if (!preloadOtherNetworks || deferredNetworks.length === 0) return;

  setTimeout(() => {
    void Promise.all(deferredNetworks.map((network) => checkNetworkEndpoints(network)));
  }, 0);
};

