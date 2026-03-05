import axios from "axios";
import { NET_ENV, getActiveBasePath, getCurrentEnv, setActiveBasePath } from "./env";

const checkedState = {
  [NET_ENV.Mainnet]: { done: false, lastCheckedAt: 0 },
  [NET_ENV.TestT5]: { done: false, lastCheckedAt: 0 },
};

const EXPECTED_NETWORK_MAGIC = {
  [NET_ENV.Mainnet]: 860833102,
  [NET_ENV.TestT5]: 894710606,
};
const HEALTHCHECK_TIMEOUT_MS = Math.max(500, Number(import.meta.env.VITE_RPC_HEALTHCHECK_TIMEOUT_MS || 1500));
const HEALTHCHECK_RECHECK_INTERVAL_MS = Math.max(
  10_000,
  Number(import.meta.env.VITE_RPC_HEALTHCHECK_RECHECK_MS || 60_000)
);
const PRIMARY_LATENCY_BIAS_MS = Math.max(
  0,
  Number(import.meta.env.VITE_RPC_PRIMARY_LATENCY_BIAS_MS || 400)
);

const NETWORKS = [
  { env: NET_ENV.Mainnet, prefix: "/api/mainnet" },
  { env: NET_ENV.TestT5, prefix: "/api/testnet" },
];

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
      { timeout: HEALTHCHECK_TIMEOUT_MS }
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
      { timeout: HEALTHCHECK_TIMEOUT_MS }
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
  if (state?.done && now-state.lastCheckedAt < HEALTHCHECK_RECHECK_INTERVAL_MS) return;
  if (state) {
    state.done = true;
    state.lastCheckedAt = now;
  }

  try {
    const expectedNetworkMagic = EXPECTED_NETWORK_MAGIC[network.env] ?? null;
    const [primaryHeight, fallbackHeight] = await Promise.all([
      checkEndpointHeight(`${network.prefix}/primary`, expectedNetworkMagic),
      checkEndpointHeight(`${network.prefix}/fallback`, expectedNetworkMagic),
    ]);
    const primaryHealthy = primaryHeight.height >= 0;
    const fallbackHealthy = fallbackHeight.height >= 0;
    const primaryFasterEnough =
      primaryHeight.latencyMs <= fallbackHeight.latencyMs + PRIMARY_LATENCY_BIAS_MS;

    if (primaryHealthy && (!fallbackHealthy || primaryFasterEnough)) {
      setActiveBasePath(network.env, `${network.prefix}/primary`);
      console.info(
        `[HealthCheck] ${network.env} using primary. Primary: ${primaryHeight.height} (${primaryHeight.latencyMs}ms), Fallback: ${fallbackHeight.height} (${fallbackHeight.latencyMs}ms)`
      );
      return;
    }

    if (fallbackHealthy) {
      setActiveBasePath(network.env, `${network.prefix}/fallback`);
      console.info(
        `[HealthCheck] ${network.env} using fallback. Primary: ${primaryHeight.height} (${primaryHeight.latencyMs}ms), Fallback: ${fallbackHeight.height} (${fallbackHeight.latencyMs}ms)`
      );
      return;
    }

    // Keep current endpoint when both probes fail to avoid forcing a bad primary path.
    const current = getActiveBasePath(network.env);
    console.warn(
      `[HealthCheck] ${network.env} both probes failed. Keeping current endpoint: ${current}`
    );
  } catch (e) {
    console.warn(`[HealthCheck] Failed for ${network.env}`, e);
  }
};

export const checkAndSetEndpoints = async (preferredEnv = getCurrentEnv()) => {
  const preferredNetwork = NETWORKS.find((network) => network.env === preferredEnv) || NETWORKS[0];
  const deferredNetworks = NETWORKS.filter((network) => network.env !== preferredNetwork.env);

  // Resolve the active network first so first-page requests can use the best endpoint earlier.
  await checkNetworkEndpoints(preferredNetwork);

  if (deferredNetworks.length > 0) {
    setTimeout(() => {
      void Promise.all(deferredNetworks.map((network) => checkNetworkEndpoints(network)));
    }, 0);
  }
};

// Expose a synchronous getter so that the API client uses the resolved URL immediately once it's set.
export const awaitEndpointsSet = async (env) => {
  if (!checkedState[env]?.done) {
    const network = NETWORKS.find(n => n.env === env) || NETWORKS[0];
    await checkNetworkEndpoints(network);
  }
};
