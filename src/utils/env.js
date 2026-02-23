export const NET_ENV = {
  Mainnet: "Mainnet",
  TestT5: "TestT5",
};

export const NETWORK_STORAGE_KEY = "neo_explorer_network";
export const NETWORK_CHANGE_EVENT = "neo-explorer-network-change";

const ENV_ALIASES = {
  [NET_ENV.Mainnet]: NET_ENV.Mainnet,
  [NET_ENV.TestT5]: NET_ENV.TestT5,
  Testnet: NET_ENV.TestT5,
};

const DEFAULT_ENV = NET_ENV.Mainnet;

const normalizeEnv = (value) => ENV_ALIASES[value] || DEFAULT_ENV;

const canUseLocalStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export const NETWORK_OPTIONS = [
  { id: NET_ENV.Mainnet, name: "N3 Mainnet" },
  { id: NET_ENV.TestT5, name: "N3 Testnet" },
];

export const NETWORK_REFRESH_INTERVALS = {
  [NET_ENV.Mainnet]: 8 * 1000,
  [NET_ENV.TestT5]: 3 * 1000,
};

export const getNetworkLabel = (env) => {
  const selected = NETWORK_OPTIONS.find((network) => network.id === normalizeEnv(env));
  return selected?.name || "N3 Mainnet";
};

export const getStoredEnv = () => {
  if (!canUseLocalStorage()) return null;

  try {
    const value = window.localStorage.getItem(NETWORK_STORAGE_KEY);
    return value ? normalizeEnv(value) : null;
  } catch (_err) {
    return null;
  }
};

export const getCurrentEnv = () => getStoredEnv() || DEFAULT_ENV;

export const getNetworkRefreshIntervalMs = (env = getCurrentEnv()) => {
  const normalizedEnv = normalizeEnv(env);
  return NETWORK_REFRESH_INTERVALS[normalizedEnv] || NETWORK_REFRESH_INTERVALS[DEFAULT_ENV];
};

export const setCurrentEnv = (env) => {
  const normalizedEnv = normalizeEnv(env);
  const previousEnv = getCurrentEnv();

  if (canUseLocalStorage()) {
    try {
      window.localStorage.setItem(NETWORK_STORAGE_KEY, normalizedEnv);
    } catch (_err) {
      // Ignore storage write errors (private mode, quota, etc.)
    }
  }

  if (typeof window !== "undefined" && normalizedEnv !== previousEnv) {
    window.dispatchEvent(
      new CustomEvent(NETWORK_CHANGE_EVENT, {
        detail: { env: normalizedEnv },
      })
    );
  }

  return normalizedEnv;
};

// AI Analysis API Configuration
export const AI_API = {
  BASE_URL: "https://op-ai-analyze-production.up.railway.app/api/parse",
  METHOD: "gettxdetail",
};

// RPC Node URLs (neofura endpoints used by Neon RPC client)
export const RPC_URLS = {
  [NET_ENV.Mainnet]: "/api/mainnet",
  [NET_ENV.TestT5]: "/api/testnet",
};

export const RPC_API_BASE_PATHS = {
  [NET_ENV.Mainnet]: "/api/mainnet",
  [NET_ENV.TestT5]: "/api/testnet",
};

// Store active endpoint paths dynamically
const activeBasePaths = {
  [NET_ENV.Mainnet]: "/api/mainnet",
  [NET_ENV.TestT5]: "/api/testnet",
};

export const setActiveBasePath = (env, path) => {
  if (activeBasePaths[env]) {
    activeBasePaths[env] = path;
  }
};

// Get RPC URL based on selected environment
export const getRpcUrl = () => activeBasePaths[getCurrentEnv()] || RPC_URLS[NET_ENV.Mainnet];

// Get API base path (proxied in dev + Vercel rewrites)
export const getRpcApiBasePath = () => activeBasePaths[getCurrentEnv()] || RPC_API_BASE_PATHS[NET_ENV.Mainnet];

const ABSOLUTE_HTTP_URL_PATTERN = /^https?:\/\//i;

export const toAbsoluteUrl = (value) => {
  if (typeof value !== "string") return "";

  const normalized = value.trim();
  if (!normalized) return "";
  if (ABSOLUTE_HTTP_URL_PATTERN.test(normalized)) return normalized;
  if (typeof window === "undefined" || !window.location?.origin) return normalized;

  return new URL(normalized, window.location.origin).toString();
};

// RPC clients from neon-js require absolute http(s) endpoints.
export const getRpcClientUrl = () => toAbsoluteUrl(getRpcApiBasePath());
