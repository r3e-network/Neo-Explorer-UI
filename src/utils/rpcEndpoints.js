import { getActiveBasePath, getConfiguredRpcBaseUrl, getCurrentEnv, toAbsoluteUrl } from "./env";

const DEFAULT_NETWORK = "mainnet";

const PRIMARY_RPC_ENDPOINTS = Object.freeze({
  mainnet: "https://api.n3index.dev/mainnet",
  testnet: "https://api.n3index.dev/testnet",
});

const FALLBACK_RPC_ENDPOINTS = Object.freeze({
  mainnet: [
    "https://api1.n3index.dev/mainnet",
    "https://api2.n3index.dev/mainnet",
    "https://api3.n3index.dev/mainnet",
  ],
  testnet: [
    "https://api1.n3index.dev/testnet",
    "https://api2.n3index.dev/testnet",
    "https://api3.n3index.dev/testnet",
  ],
});

const PRIMARY_WS_ENDPOINTS = Object.freeze({
  mainnet: "wss://ws.r3e.network/mainnet",
  testnet: "wss://ws.r3e.network/testnet",
});

const FALLBACK_WS_ENDPOINTS = Object.freeze({
  mainnet: ["wss://neofura.ngd.network/ws"],
  testnet: ["wss://testmagnet.ngd.network/ws"],
});

const NETWORK_BASE_PATTERN = /\/api\/(mainnet|testnet)(?:\/(primary|fallback))?$/i;
const normalizeBaseUrl = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\/+$/, "");
};

const reorderCandidates = (candidates, preferred) => {
  const normalizedPreferred = normalizeBaseUrl(preferred);
  if (!normalizedPreferred) return candidates;

  const remaining = [];
  let preferredCandidate = "";
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeBaseUrl(candidate);
    if (!preferredCandidate && normalizedCandidate === normalizedPreferred) {
      preferredCandidate = candidate;
      continue;
    }
    remaining.push(candidate);
  }

  return preferredCandidate ? [preferredCandidate, ...remaining] : candidates;
};

const derivePreferredCandidate = (value = getCurrentEnv()) => {
  return normalizeBaseUrl(getActiveBasePath(value));
};

const parseConfiguredNetworkBase = (value) => {
  const normalized = normalizeBaseUrl(value);
  const matched = normalized.match(NETWORK_BASE_PATTERN);
  if (!matched) return null;

  const basePrefix = normalized.slice(0, matched.index);
  const network = matched[1].toLowerCase();

  return {
    normalized,
    prefix: `${basePrefix}/api/${network}`,
    endpoint: (matched[2] || "").toLowerCase() || null,
  };
};

const getConfiguredRpcEndpointCandidates = (value = getCurrentEnv()) => {
  const configuredBaseUrl = normalizeBaseUrl(getConfiguredRpcBaseUrl(value));
  if (!configuredBaseUrl) return null;

  const parsed = parseConfiguredNetworkBase(configuredBaseUrl);
  if (!parsed) return [toAbsoluteUrl(configuredBaseUrl)];

  const primary = toAbsoluteUrl(`${parsed.prefix}/primary`);
  const fallback = toAbsoluteUrl(`${parsed.prefix}/fallback`);
  const fallback2 = toAbsoluteUrl(`${parsed.prefix}/fallback2`);
  const fallback3 = toAbsoluteUrl(`${parsed.prefix}/fallback3`);

  if (parsed.endpoint === "primary") return [primary, fallback, fallback2, fallback3];
  if (parsed.endpoint === "fallback") return [fallback, primary, fallback2, fallback3];
  return [primary, fallback, fallback2, fallback3];
};

export const toNetworkMode = (value = getCurrentEnv()) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return DEFAULT_NETWORK;
  if (raw === "testt5" || raw === "testnet") return "testnet";
  if (raw === "mainnet") return "mainnet";
  if (raw.includes("test") || raw.includes("t5")) return "testnet";
  return "mainnet";
};

export const getRpcEndpointCandidates = (value = getCurrentEnv()) => {
  const configured = getConfiguredRpcEndpointCandidates(value);
  if (configured?.length) {
    return reorderCandidates(configured, normalizeBaseUrl(getActiveBasePath(value)));
  }

  const network = toNetworkMode(value);
  const primary = PRIMARY_RPC_ENDPOINTS[network] || PRIMARY_RPC_ENDPOINTS.mainnet;
  const fallback = FALLBACK_RPC_ENDPOINTS[network] || FALLBACK_RPC_ENDPOINTS.mainnet;
  return reorderCandidates([primary, ...fallback], derivePreferredCandidate(value));
};

export const getPrimaryRpcEndpoint = (value = getCurrentEnv()) =>
  getRpcEndpointCandidates(value)[0];

export const getWsEndpointCandidates = (value = getCurrentEnv()) => {
  const network = toNetworkMode(value);
  const primary = PRIMARY_WS_ENDPOINTS[network] || PRIMARY_WS_ENDPOINTS.mainnet;
  const fallback = FALLBACK_WS_ENDPOINTS[network] || FALLBACK_WS_ENDPOINTS.mainnet;
  return [primary, ...fallback];
};

export const getPrimaryWsEndpoint = (value = getCurrentEnv()) =>
  getWsEndpointCandidates(value)[0];

export const callWithRpcEndpointFallback = async (value, handler) => {
  const candidates = getRpcEndpointCandidates(value);
  let lastError = null;

  for (const endpoint of candidates) {
    try {
      // Execute against primary first, then legacy backups if needed.
      return await handler(endpoint);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No RPC endpoint candidates available");
};
