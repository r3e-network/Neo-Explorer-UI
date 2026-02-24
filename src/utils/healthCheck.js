import axios from "axios";
import { NET_ENV, getCurrentEnv, setActiveBasePath } from "./env";

let checked = {
  [NET_ENV.Mainnet]: false,
  [NET_ENV.TestT5]: false,
};

const NETWORKS = [
  { env: NET_ENV.Mainnet, prefix: "/api/mainnet" },
  { env: NET_ENV.TestT5, prefix: "/api/testnet" },
];

const checkEndpointHeight = async (url) => {
  const start = Date.now();
  try {
    const res = await axios.post(
      url,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "GetBlockCount",
        params: {},
      },
      { timeout: 5000 }
    );

    const result = res.data?.result;
    const latencyMs = Date.now() - start;
    if (typeof result === "object" && result !== null) {
      return {
        height: Number(result.index || result.count || 0),
        latencyMs,
      };
    }
    return {
      height: Number(result || 0),
      latencyMs,
    };
  } catch (e) {
    return {
      height: -1,
      latencyMs: Number.POSITIVE_INFINITY,
    };
  }
};

const checkNetworkEndpoints = async (network) => {
  if (!network || checked[network.env]) return;
  checked[network.env] = true;

  try {
    const [primaryHeight, fallbackHeight] = await Promise.all([
      checkEndpointHeight(`${network.prefix}/primary`),
      checkEndpointHeight(`${network.prefix}/fallback`),
    ]);

    if (primaryHeight.height === -1 && fallbackHeight.height === -1) {
      // Both failed, default to primary
      setActiveBasePath(network.env, `${network.prefix}/primary`);
    } else if (primaryHeight.height === -1 && fallbackHeight.height >= 0) {
      setActiveBasePath(network.env, `${network.prefix}/fallback`);
    } else if (fallbackHeight.height === -1 && primaryHeight.height >= 0) {
      setActiveBasePath(network.env, `${network.prefix}/primary`);
    } else if (fallbackHeight.height - primaryHeight.height > 5) {
      setActiveBasePath(network.env, `${network.prefix}/fallback`);
      console.info(
        `[HealthCheck] ${network.env} using fallback. Primary: ${primaryHeight.height} (${primaryHeight.latencyMs}ms), Fallback: ${fallbackHeight.height} (${fallbackHeight.latencyMs}ms)`
      );
    } else if (primaryHeight.height - fallbackHeight.height > 5) {
      setActiveBasePath(network.env, `${network.prefix}/primary`);
      console.info(
        `[HealthCheck] ${network.env} using primary. Primary: ${primaryHeight.height} (${primaryHeight.latencyMs}ms), Fallback: ${fallbackHeight.height} (${fallbackHeight.latencyMs}ms)`
      );
    } else if (fallbackHeight.latencyMs + 150 < primaryHeight.latencyMs) {
      // Heights are close enough. Favor noticeably faster endpoint.
      setActiveBasePath(network.env, `${network.prefix}/fallback`);
      console.info(
        `[HealthCheck] ${network.env} using fallback (latency). Primary: ${primaryHeight.height} (${primaryHeight.latencyMs}ms), Fallback: ${fallbackHeight.height} (${fallbackHeight.latencyMs}ms)`
      );
    } else {
      setActiveBasePath(network.env, `${network.prefix}/primary`);
      console.info(
        `[HealthCheck] ${network.env} using primary. Primary: ${primaryHeight.height} (${primaryHeight.latencyMs}ms), Fallback: ${fallbackHeight.height} (${fallbackHeight.latencyMs}ms)`
      );
    }
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
