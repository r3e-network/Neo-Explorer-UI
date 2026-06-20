export const NET_ENV = {
  Mainnet: "Mainnet",
  TestT5: "TestT5",
};

const NETWORK_STORAGE_KEY = "neo_explorer_network";
export const NETWORK_CHANGE_EVENT = "neo-explorer-network-change";

const ENV_ALIASES = {
  [NET_ENV.Mainnet]: NET_ENV.Mainnet,
  [NET_ENV.TestT5]: NET_ENV.TestT5,
  Testnet: NET_ENV.TestT5,
  MainNet: NET_ENV.Mainnet,
  mainnet: NET_ENV.Mainnet,
  testnet: NET_ENV.TestT5,
  testt5: NET_ENV.TestT5,
};

const DEFAULT_ENV = NET_ENV.Mainnet;

const normalizeEnv = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_ENV;
  return ENV_ALIASES[raw] || ENV_ALIASES[raw.toLowerCase()] || DEFAULT_ENV;
};

const canUseLocalStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export const NETWORK_OPTIONS = [
  { id: NET_ENV.Mainnet, name: "N3 Mainnet" },
  { id: NET_ENV.TestT5, name: "N3 Testnet" },
];

const NETWORK_REFRESH_INTERVALS = {
  [NET_ENV.Mainnet]: 3 * 1000,
  [NET_ENV.TestT5]: 3 * 1000,
};

export const getNetworkLabel = (env) => {
  const selected = NETWORK_OPTIONS.find((network) => network.id === normalizeEnv(env));
  return selected?.name || "N3 Mainnet";
};

const getStoredEnv = () => {
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

const DEFAULT_RPC_BASE_URLS = {
  [NET_ENV.Mainnet]: "/rpc/mainnet",
  [NET_ENV.TestT5]: "/rpc/testnet",
};

const RPC_API_BASE_PATHS = {
  ...DEFAULT_RPC_BASE_URLS,
};

// Store active endpoint paths dynamically
const activeBasePaths = {
  ...DEFAULT_RPC_BASE_URLS,
};

const NETWORK_BASE_PATTERN = /\/(api|rpc)\/(mainnet|testnet)(?:\/(primary|fallback(?:2|3)?))?$/i;

const normalizeBaseUrl = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\/+$/, "");
};

const configuredRpcBaseUrl = normalizeBaseUrl(import.meta.env.VITE_RPC_BASE_URL || "");

const parseConfiguredNetworkBase = (value) => {
  const normalized = normalizeBaseUrl(value);
  const matched = normalized.match(NETWORK_BASE_PATTERN);
  if (!matched) return null;

  return {
    normalized,
    basePrefix: normalized.slice(0, matched.index),
    routeBase: (matched[1] || "rpc").toLowerCase(),
    endpoint: (matched[3] || "").toLowerCase() || null,
  };
};

export const getConfiguredRpcBaseUrl = (env = getCurrentEnv()) => {
  if (!configuredRpcBaseUrl) return "";

  const parsed = parseConfiguredNetworkBase(configuredRpcBaseUrl);
  if (!parsed) return configuredRpcBaseUrl;

  const network = normalizeEnv(env) === NET_ENV.TestT5 ? "testnet" : "mainnet";
  const targetPrefix = `${parsed.basePrefix}/${parsed.routeBase}/${network}`;
  return parsed.endpoint ? `${targetPrefix}/${parsed.endpoint}` : targetPrefix;
};

export const setActiveBasePath = (env, path) => {
  if (activeBasePaths[env]) {
    activeBasePaths[env] = path;
  }
};

export const getActiveBasePath = (env = getCurrentEnv()) => {
  const normalized = normalizeEnv(env);
  return activeBasePaths[normalized] || RPC_API_BASE_PATHS[normalized] || RPC_API_BASE_PATHS[NET_ENV.Mainnet];
};

// Get API base path (proxied in dev + Vercel rewrites)
export const getRpcApiBasePath = (env = getCurrentEnv()) =>
  getConfiguredRpcBaseUrl(env) || activeBasePaths[normalizeEnv(env)] || RPC_API_BASE_PATHS[NET_ENV.Mainnet];

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
export const getRpcClientUrl = (env = getCurrentEnv()) => toAbsoluteUrl(getRpcApiBasePath(env));

// Canonical "mainnet" | "testnet" string used by Postgres REST queries
// (network=eq.<value>) and the indexer URL prefix (/data/<value>/...).
// Replaces ~11 inline copies of the same env.includes("test") ternary.
export const resolveNetworkName = (env = getCurrentEnv()) => {
  const raw = String(env || "").toLowerCase();
  return raw.includes("test") || raw.includes("t5") ? "testnet" : "mainnet";
};
