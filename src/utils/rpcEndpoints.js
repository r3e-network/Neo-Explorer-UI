import { getActiveBasePath, getConfiguredRpcBaseUrl, getCurrentEnv, toAbsoluteUrl } from "./env";

const DEFAULT_NETWORK = "mainnet";

const PRIMARY_RPC_ENDPOINTS = Object.freeze({
  mainnet: "/rpc/mainnet/primary",
  testnet: "/rpc/testnet/primary",
});

// Browser-side fallback goes through Vercel so it stays CORS-safe. The
// fallback destination is the Cloudflare worker, whose RPC route is repointed
// to direct neo-go during Phase 2e.
const FALLBACK_RPC_ENDPOINTS = Object.freeze({
  mainnet: [
    "/rpc/mainnet/fallback",
  ],
  testnet: [
    "/rpc/testnet/fallback",
  ],
});

const NETWORK_BASE_PATTERN = /\/(api|rpc)\/(mainnet|testnet)(?:\/(primary|fallback(?:2|3)?))?$/i;
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
  const routeBase = matched[1].toLowerCase();
  const network = matched[2].toLowerCase();

  return {
    normalized,
    prefix: `${basePrefix}/${routeBase}/${network}`,
    endpoint: (matched[3] || "").toLowerCase() || null,
  };
};

// Single server — only primary endpoint, no fallbacks.
const getConfiguredRpcEndpointCandidates = (value = getCurrentEnv()) => {
  const configuredBaseUrl = normalizeBaseUrl(getConfiguredRpcBaseUrl(value));
  if (!configuredBaseUrl) return null;

  const parsed = parseConfiguredNetworkBase(configuredBaseUrl);
  if (!parsed) return [toAbsoluteUrl(configuredBaseUrl)];

  return [toAbsoluteUrl(`${parsed.prefix}/primary`)];
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
    return reorderCandidates(configured, normalizeBaseUrl(getActiveBasePath(value))).map(toAbsoluteUrl);
  }

  const network = toNetworkMode(value);
  const primary = PRIMARY_RPC_ENDPOINTS[network] || PRIMARY_RPC_ENDPOINTS.mainnet;
  const fallback = FALLBACK_RPC_ENDPOINTS[network] || FALLBACK_RPC_ENDPOINTS.mainnet;
  // neon-js's RpcDispatcher rejects relative URLs at constructor time, so
  // fold every candidate (the primary path is relative) through toAbsoluteUrl.
  return reorderCandidates([primary, ...fallback], derivePreferredCandidate(value)).map(toAbsoluteUrl);
};

export const getPrimaryRpcEndpoint = (value = getCurrentEnv()) =>
  getRpcEndpointCandidates(value)[0];

export const callWithRpcEndpointFallback = async (value, handler) => {
  const candidates = getRpcEndpointCandidates(value);
  let lastError = null;

  for (const endpoint of candidates) {
    try {
      // Execute against direct-node primary first, then the worker RPC route.
      return await handler(endpoint);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No RPC endpoint candidates available");
};
