import { getActiveBasePath, getConfiguredRpcBaseUrl, getCurrentEnv, toAbsoluteUrl } from "./env";

const DEFAULT_NETWORK = "mainnet";

const PRIMARY_RPC_ENDPOINTS = Object.freeze({
  mainnet: "/rpc/mainnet/primary",
  testnet: "/rpc/testnet/primary",
});

const NETWORK_BASE_PATTERN = /\/(api|rpc)\/(mainnet|testnet)(?:\/(primary|fallback(?:2|3)?))?$/i;
const EXPECTED_NETWORK_MAGIC = Object.freeze({
  mainnet: 860833102,
  testnet: 894710606,
});
const NETWORK_VALIDATION_TIMEOUT_MS = 1200;
const endpointNetworkCache = new Map();

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
  // neon-js's RpcDispatcher rejects relative URLs at constructor time, so
  // fold the primary path through toAbsoluteUrl.
  return reorderCandidates([primary], derivePreferredCandidate(value)).map(toAbsoluteUrl);
};

export const getPrimaryRpcEndpoint = (value = getCurrentEnv()) =>
  getRpcEndpointCandidates(value)[0];

function createNetworkMismatchError(endpoint, expected, actual) {
  const error = new Error(`RPC endpoint network mismatch on ${endpoint}: expected ${expected}, got ${actual}`);
  error.code = "RPC_NETWORK_MISMATCH";
  error.isNetworkMismatch = true;
  error.expectedNetworkMagic = expected;
  error.actualNetworkMagic = actual;
  error.endpoint = endpoint;
  return error;
}

function isNetworkMismatchError(error) {
  return error?.code === "RPC_NETWORK_MISMATCH" || error?.isNetworkMismatch;
}

function extractNetworkMagic(payload) {
  return Number(payload?.result?.protocol?.network ?? payload?.result?.network);
}

async function validateEndpointNetwork(endpoint, network) {
  const expected = EXPECTED_NETWORK_MAGIC[toNetworkMode(network)];
  if (!Number.isFinite(expected) || typeof fetch !== "function") return;

  const normalizedEndpoint = normalizeBaseUrl(endpoint);
  const cacheKey = `${normalizedEndpoint}::${expected}`;
  if (endpointNetworkCache.get(cacheKey)) return;

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), NETWORK_VALIDATION_TIMEOUT_MS) : null;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getversion", params: [] }),
      signal: controller?.signal,
    });
    if (!response.ok) return;
    const payload = await response.json();
    const actual = extractNetworkMagic(payload);
    if (!Number.isFinite(actual)) return;
    if (actual !== expected) {
      throw createNetworkMismatchError(endpoint, expected, actual);
    }
    endpointNetworkCache.set(cacheKey, true);
  } catch (error) {
    if (isNetworkMismatchError(error)) throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const callWithRpcEndpointFallback = async (value, handler) => {
  const candidates = getRpcEndpointCandidates(value);
  const network = toNetworkMode(value);
  let lastError = null;

  for (const endpoint of candidates) {
    try {
      await validateEndpointNetwork(endpoint, network);
      return await handler(endpoint);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No RPC endpoint candidates available");
};
