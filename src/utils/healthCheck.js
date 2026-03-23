import axios from "axios";
import { NET_ENV, getActiveBasePath, getCurrentEnv, setActiveBasePath } from "./env";
import { getRpcEndpointCandidates } from "./rpcEndpoints";

const checkedState = {
  [NET_ENV.Mainnet]: { done: false, lastCheckedAt: 0 },
  [NET_ENV.TestT5]: { done: false, lastCheckedAt: 0 },
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
const ENDPOINT_SWITCH_HYSTERESIS_MS = Math.max(
  0,
  Number(import.meta.env.VITE_RPC_ENDPOINT_SWITCH_HYSTERESIS_MS || 1000),
);

const NETWORKS = [
  { env: NET_ENV.Mainnet, prefix: "/api/mainnet" },
  { env: NET_ENV.TestT5, prefix: "/api/testnet" },
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

const usesDefaultGlobalCandidates = (candidates) =>
  candidates.some((candidate) => candidate.includes("api.n3index.dev")) ||
  candidates.some((candidate) => candidate.includes("api1.n3index.dev"));

const getProbeCandidates = (network) => {
  const rpcCandidates = uniqueCandidates(getRpcEndpointCandidates(network.env));
  if (!usesDefaultGlobalCandidates(rpcCandidates)) {
    return rpcCandidates;
  }

  const directBackups = rpcCandidates.filter(
    (candidate) =>
      candidate.startsWith("http") &&
      !candidate.includes("api.n3index.dev") &&
      !candidate.includes("api1.n3index.dev"),
  );

  return uniqueCandidates([
    `${network.prefix}/primary`,
    `${network.prefix}/fallback`,
    ...directBackups,
  ]);
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
  const start = Date.now();
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

    const res = await axios.post(
      url,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "GetBlockCount",
        params: {},
      },
      { timeout: HEALTHCHECK_TIMEOUT_MS },
    );

    const result = res.data?.result;
    const latencyMs = Date.now() - start;
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
  if (state?.done && now - state.lastCheckedAt < HEALTHCHECK_RECHECK_INTERVAL_MS) return;
  if (state) {
    state.done = true;
    state.lastCheckedAt = now;
  }

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
    const currentCandidate = healthyCandidates.find((candidate) => candidate.basePath === current);

    const commitSelection = (path, message) => {
      if (current === path) return;
      setActiveBasePath(network.env, path);
      console.info(message);
    };

    if (healthyCandidates.length > 0) {
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
  }
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

// Expose a synchronous getter so that the API client uses the resolved URL immediately once it's set.
export const awaitEndpointsSet = async (env) => {
  if (!checkedState[env]?.done) {
    const network = NETWORKS.find((n) => n.env === env) || NETWORKS[0];
    await checkNetworkEndpoints(network);
  }
};
