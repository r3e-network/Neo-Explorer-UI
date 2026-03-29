import axios from "axios";
import { getCurrentEnv, getRpcApiBasePath, NET_ENV, setActiveBasePath } from "../utils/env";
import { getRpcEndpointCandidates } from "../utils/rpcEndpoints";

const LEGACY_RPC_BASE_URL = "/rpc";
const parseTimeout = (value, fallbackMs) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMs;
};
const DEFAULT_RPC_TIMEOUT_MS = parseTimeout(import.meta.env.VITE_RPC_TIMEOUT_MS, 5000);
const FAILOVER_RPC_TIMEOUT_MS = parseTimeout(import.meta.env.VITE_RPC_FAILOVER_TIMEOUT_MS, 5000);
const NETWORK_VALIDATION_TIMEOUT_MS = Number(import.meta.env.VITE_RPC_NETWORK_VALIDATION_TIMEOUT_MS || 350);
const INITIAL_HEALTH_CHECK_MAX_WAIT_MS = parseTimeout(
  import.meta.env.VITE_RPC_STARTUP_WAIT_MS,
  120
);
// Hedge disabled — single server, no fallback to race against.
const HEDGE_DELAY_MS = Math.max(50, Number(import.meta.env.VITE_RPC_HEDGE_DELAY_MS || 250));
const ENABLE_RPC_STARTUP_HEDGE = false;
const NETWORK_BASE_PATTERN = /\/(api|rpc)\/(mainnet|testnet)(?:\/(primary|fallback(?:2|3)?))?$/i;
const HEDGE_SKIPPED_ERROR_CODE = "HEDGE_SKIPPED";
const NETWORK_MISMATCH_ERROR_CODE = "RPC_NETWORK_MISMATCH";
const EXPECTED_NETWORK_MAGIC = {
  [NET_ENV.Mainnet]: 860833102,
  [NET_ENV.TestT5]: 894710606,
};
const FALLBACK_FIRST_INDEXED_METHOD_PATTERNS = [
  /ByAddress$/i,
  /HeldByAddress$/i,
  /ByTransactionHash$/i,
  /ByContractHash(?:TokenId)?$/i,
  /ByCandidateAddress$/i,
];
const endpointNetworkCache = new Map();

export const __resetEndpointNetworkCacheForTests = () => {
  endpointNetworkCache.clear();
};

const normalizeBaseUrl = (baseUrl) => {
  if (typeof baseUrl !== "string") return "";

  return baseUrl.trim().replace(/\/+$/, "");
};

const configuredRpcBaseUrl = normalizeBaseUrl(import.meta.env.VITE_RPC_BASE_URL || "");

const useConfiguredBaseUrl = Boolean(configuredRpcBaseUrl && configuredRpcBaseUrl !== LEGACY_RPC_BASE_URL);

const parseNetworkBase = (baseUrl) => {
  const normalized = normalizeBaseUrl(baseUrl);
  const matched = normalized.match(NETWORK_BASE_PATTERN);
  if (!matched) return null;

  const routeBase = matched[1].toLowerCase();
  const network = matched[2].toLowerCase();
  const basePrefix = normalized.slice(0, matched.index);

  return {
    normalized,
    network,
    routeBase,
    basePrefix,
    prefix: `${basePrefix}/${routeBase}/${network}`,
    endpoint: (matched[3] || "").toLowerCase() || null,
  };
};

const configuredRpcBaseMatch = parseNetworkBase(configuredRpcBaseUrl);
const useFixedConfiguredBaseUrl = useConfiguredBaseUrl && !configuredRpcBaseMatch;

const ensureNetworkEndpointBase = (baseUrl) => {
  const normalized = normalizeBaseUrl(baseUrl);
  const parsed = parseNetworkBase(normalized);
  if (!parsed || parsed.endpoint) return normalized;
  return `${parsed.prefix}/primary`;
};

const rewriteConfiguredBaseUrl = (baseUrl, env = getCurrentEnv()) => {
  const normalized = normalizeBaseUrl(baseUrl);
  const parsed = parseNetworkBase(normalized);
  if (!parsed) return normalized;

  const network = env === NET_ENV.TestT5 ? "testnet" : "mainnet";
  const targetPrefix = `${parsed.basePrefix}/${parsed.routeBase}/${network}`;
  return parsed.endpoint ? `${targetPrefix}/${parsed.endpoint}` : targetPrefix;
};

const resolveRpcBaseUrl = () => {
  if (useConfiguredBaseUrl) {
    return ensureNetworkEndpointBase(rewriteConfiguredBaseUrl(configuredRpcBaseUrl));
  }

  return ensureNetworkEndpointBase(getRpcApiBasePath());
};

const reorderBaseUrls = (candidates, preferred) => {
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

const buildNetworkRetryBaseUrls = (parsed) => {
  const candidates = [
    `${parsed.prefix}/primary`,
    `${parsed.prefix}/fallback`,
    `${parsed.prefix}/fallback2`,
    `${parsed.prefix}/fallback3`,
  ];
  const preferredCandidate = parsed.endpoint ? `${parsed.prefix}/${parsed.endpoint}` : `${parsed.prefix}/primary`;
  return reorderBaseUrls(candidates, preferredCandidate);
};

const buildRetryBaseUrls = (baseUrl) => {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  if (!normalizedBaseUrl) return [];
  if (useFixedConfiguredBaseUrl) return [normalizedBaseUrl];

  const parsed = parseNetworkBase(normalizedBaseUrl);
  if (parsed) {
    return buildNetworkRetryBaseUrls(parsed);
  }

  const env = getEnvForBaseUrl(normalizedBaseUrl) || getCurrentEnv();
  const candidates = [...new Set(getRpcEndpointCandidates(env).filter(Boolean))];
  return [normalizedBaseUrl, ...candidates.filter((candidate) => normalizeBaseUrl(candidate) !== normalizedBaseUrl)];
};

const shouldUseStartupHedge = (method, preferredBaseUrl, fallbackBaseUrl) => {
  if (!ENABLE_RPC_STARTUP_HEDGE) return false;
  if (!fallbackBaseUrl || useFixedConfiguredBaseUrl) return false;

  const parsed = parseNetworkBase(preferredBaseUrl);
  if (!parsed || (parsed.endpoint && parsed.endpoint !== "primary")) return false;

  return /^(get|find|search|invoke)/i.test(String(method || ""));
};

const isRetryableTransportError = (error) => {
  if (!error) return false;
  if (error.code === NETWORK_MISMATCH_ERROR_CODE || error.isNetworkMismatch) return true;
  if (error.name === "CanceledError" || error.code === "ERR_CANCELED") return false;
  if (error.name === "RpcError" || error.isRpcError) return false;
  if (error.response) {
    return error.response.status >= 500 || error.response.status === 429;
  }

  const message = String(error.message || "").toLowerCase();
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return true;
  return /(timeout|network error|failed to fetch|socket hang up|econnreset|proxy error)/.test(message);
};

const createHedgeSkippedError = () => {
  const error = new Error("Hedge request skipped");
  error.code = HEDGE_SKIPPED_ERROR_CODE;
  return error;
};

const isHedgeSkippedError = (error) => error?.code === HEDGE_SKIPPED_ERROR_CODE;

const createNetworkMismatchError = (baseURL, expected, actual) => {
  const err = new Error(
    `RPC endpoint network mismatch on ${baseURL}: expected ${expected}, got ${actual ?? "unknown"}`
  );
  err.code = NETWORK_MISMATCH_ERROR_CODE;
  err.isNetworkMismatch = true;
  err.baseURL = baseURL;
  err.expectedNetworkMagic = expected;
  err.actualNetworkMagic = actual;
  return err;
};

const getEnvForBaseUrl = (baseUrl) => {
  const parsed = parseNetworkBase(baseUrl);
  if (!parsed) return null;
  return parsed.network === "mainnet" ? NET_ENV.Mainnet : NET_ENV.TestT5;
};

const getExpectedNetworkMagic = (baseUrl) => {
  const env = getEnvForBaseUrl(baseUrl);
  if (!env) return null;
  const expected = Number(EXPECTED_NETWORK_MAGIC[env]);
  return Number.isFinite(expected) ? expected : null;
};

const shouldPreferFallbackFirst = (method, baseUrls = []) => {
  if (!Array.isArray(baseUrls) || baseUrls.length < 2) return false;
  const methodName = String(method || "").trim();
  if (!methodName) return false;

  const env = getEnvForBaseUrl(baseUrls[0]);
  if (env !== NET_ENV.Mainnet) return false;

  return FALLBACK_FIRST_INDEXED_METHOD_PATTERNS.some((pattern) => pattern.test(methodName));
};

const markActiveEndpoint = (baseUrl) => {
  if (useConfiguredBaseUrl) return;
  const parsed = parseNetworkBase(baseUrl);
  if (!parsed || !parsed.endpoint) return;
  const env = getEnvForBaseUrl(baseUrl) || getCurrentEnv();
  setActiveBasePath(env, parsed.normalized);
};

const createRpcError = (rpcErr) => {
  const err = new Error(`RPC Error ${rpcErr.code || ""}: ${rpcErr.message || "Unknown RPC error"}`.trim());
  err.name = "RpcError";
  err.isRpcError = true;
  err.rpc = rpcErr;
  return err;
};

const extractAggregateError = (error) => {
  if (!(error instanceof AggregateError) || !Array.isArray(error.errors)) return error;
  const meaningful = error.errors.find((item) => item && !isHedgeSkippedError(item));
  return meaningful || error.errors[0] || error;
};

const executeRpcRequest = async (payload, { baseURL, timeout, signal, suppressDevErrorLog = true }) => {
  const requestConfig = {
    timeout,
    baseURL,
    __manualBaseURL: true,
    __suppressDevErrorLog: suppressDevErrorLog,
  };
  if (signal) requestConfig.signal = signal;

  const response = await api.post("", payload, requestConfig);
  if (response.data?.error) {
    throw createRpcError(response.data.error);
  }

  return response.data?.result;
};

const validateEndpointNetwork = async ({ baseURL, timeout, signal }) => {
  const expectedNetworkMagic = getExpectedNetworkMagic(baseURL);
  if (!Number.isFinite(expectedNetworkMagic)) return;

  const cacheKey = `${baseURL}::${expectedNetworkMagic}`;
  if (endpointNetworkCache.get(cacheKey)) return;

  try {
    const versionPayload = { jsonrpc: "2.0", id: nextRpcId(), method: "getversion", params: [] };
    const validationTimeout = Number.isFinite(NETWORK_VALIDATION_TIMEOUT_MS)
      ? Math.max(300, NETWORK_VALIDATION_TIMEOUT_MS)
      : 1000;
    const versionResult = await executeRpcRequest(versionPayload, {
      baseURL,
      timeout: Math.min(timeout, validationTimeout),
      signal,
    });
    const reportedNetworkMagic = Number(versionResult?.protocol?.network ?? versionResult?.network);
    if (Number.isFinite(reportedNetworkMagic) && reportedNetworkMagic !== expectedNetworkMagic) {
      throw createNetworkMismatchError(baseURL, expectedNetworkMagic, reportedNetworkMagic);
    }
    if (Number.isFinite(reportedNetworkMagic) && reportedNetworkMagic === expectedNetworkMagic) {
      endpointNetworkCache.set(cacheKey, true);
    }
  } catch (error) {
    if (error?.code === NETWORK_MISMATCH_ERROR_CODE || error?.isNetworkMismatch) {
      throw error;
    }
    // If getversion is unavailable on an endpoint (e.g., Fura), continue without hard-failing.
    // Cache it as valid so we don't penalize every subsequent request with a failing getversion call.
    endpointNetworkCache.set(cacheKey, true);
  }
};

const executeRpcRequestWithStartupHedge = async (
  payload,
  { primaryBaseURL, fallbackBaseURL, timeout, signal }
) => {
  let settled = false;
  let fallbackTriggered = false;
  let triggerFallback = null;
  const fallbackTriggerPromise = new Promise((resolve) => {
    triggerFallback = () => {
      if (fallbackTriggered) return;
      fallbackTriggered = true;
      resolve();
    };
  });
  const fallbackTimer = setTimeout(() => {
    triggerFallback();
  }, HEDGE_DELAY_MS);

  const primaryPromise = executeRpcRequest(payload, {
    baseURL: primaryBaseURL,
    timeout,
    signal,
  }).then((result) => {
    settled = true;
    return { result, baseURL: primaryBaseURL };
  }).catch((error) => {
    if (!settled && !signal?.aborted) triggerFallback();
    throw error;
  });

  const fallbackPromise = (async () => {
    await fallbackTriggerPromise;
    if (settled || signal?.aborted) throw createHedgeSkippedError();
    const result = await executeRpcRequest(payload, {
      baseURL: fallbackBaseURL,
      timeout: FAILOVER_RPC_TIMEOUT_MS,
      signal,
    });
    settled = true;
    return { result, baseURL: fallbackBaseURL };
  })();

  try {
    return await Promise.any([primaryPromise, fallbackPromise]);
  } catch (error) {
    throw extractAggregateError(error);
  } finally {
    clearTimeout(fallbackTimer);
  }
};

// Create axios instance with default config
const api = axios.create({
  baseURL: resolveRpcBaseUrl(),
  timeout: DEFAULT_RPC_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

import { checkAndSetEndpoints } from "../utils/healthCheck";

// Wait for initial health check before making requests
let initialCheckResolved = false;
const initialCheckPromise = Promise.resolve(checkAndSetEndpoints())
  .catch(() => {})
  .finally(() => {
    initialCheckResolved = true;
  });

const waitForInitialHealthCheck = async () => {
  if (initialCheckResolved) return;

  await Promise.race([
    initialCheckPromise,
    new Promise((resolve) => {
      setTimeout(resolve, INITIAL_HEALTH_CHECK_MAX_WAIT_MS);
    }),
  ]);
};

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    await waitForInitialHealthCheck();
    // Single server — no need to re-check endpoints on every request.

    if (!config.__manualBaseURL) {
      config.baseURL = resolveRpcBaseUrl();
    }
    delete config.__manualBaseURL;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.DEV && !error?.config?.__suppressDevErrorLog) {
      console.error("API Error:", error.message);
    }
    return Promise.reject(error);
  }
);

// Incrementing RPC ID for unique request identification
let _rpcId = 0;
const nextRpcId = () => (_rpcId = (_rpcId + 1) % 2147483647);

/**
 * Base RPC call.
 * @param {string} method - RPC method name
 * @param {object|Array} params - RPC parameters
 * @param {{ signal?: AbortSignal }} [options] - Optional request options
 * @param {AbortSignal} [options.signal] - AbortController signal to cancel the request
 * @returns {Promise<any>}
 */
export const rpc = async (method, params = [], { signal, suppressLog = false } = {}) => {
  const payload = { jsonrpc: "2.0", id: nextRpcId(), method, params };
  const preferredBaseUrl = resolveRpcBaseUrl();
  const retryBaseUrls = [...new Set(buildRetryBaseUrls(preferredBaseUrl).filter(Boolean))];
  const orderedBaseUrls = shouldPreferFallbackFirst(method, retryBaseUrls)
    ? [...retryBaseUrls.slice(1), retryBaseUrls[0]]
    : retryBaseUrls;
  const baseUrls = orderedBaseUrls.length ? orderedBaseUrls : [preferredBaseUrl];
  const startupHedgeEnabled = shouldUseStartupHedge(method, preferredBaseUrl, baseUrls[1]);
  let lastError = null;

  try {
    for (let index = 0; index < baseUrls.length; index += 1) {
      const baseURL = baseUrls[index];
      const timeout = index === 0 ? DEFAULT_RPC_TIMEOUT_MS : FAILOVER_RPC_TIMEOUT_MS;
      try {
        await validateEndpointNetwork({ baseURL, timeout, signal });

        if (index === 0 && startupHedgeEnabled) {
          const hedged = await executeRpcRequestWithStartupHedge(payload, {
            primaryBaseURL: baseURL,
            fallbackBaseURL: baseUrls[1],
            timeout,
            signal,
          });
          markActiveEndpoint(hedged.baseURL);
          return hedged.result;
        }

        const result = await executeRpcRequest(payload, { baseURL, timeout, signal });
        markActiveEndpoint(baseURL);
        return result;
      } catch (error) {
        if (signal?.aborted) throw error;
        lastError = error;
        const hasFallback = index < baseUrls.length - 1;
        if (!hasFallback || !isRetryableTransportError(error)) {
          throw error;
        }
        if (import.meta.env.DEV && !suppressLog) {
          console.warn(`[RPC] ${method} failed on ${baseURL}, retrying fallback endpoint`);
        }
      }
    }
    throw lastError || new Error(`RPC request failed for ${method}`);
  } catch (error) {
    if (import.meta.env.DEV && !suppressLog) console.error(`RPC Error [${method}]:`, error);
    throw error;
  }
};

/**
 * Safe RPC wrapper with error handling and default value
 * @param {string} method - RPC method name
 * @param {object|Array} params - RPC parameters
 * @param {any} defaultValue - Default value on error
 * @returns {Promise<any>}
 */
export const safeRpc = async (method, params = [], defaultValue = null, { signal, throwOnError } = {}) => {
  try {
    const result = await rpc(method, params, { signal, suppressLog: true });
    const normalized = normalizeItem(result);
    return normalized ?? defaultValue;
  } catch (error) {
    if (signal?.aborted || throwOnError) throw error;
    return defaultValue;
  }
};

/**
 * Normalize neo3fura field names to the format our components expect.
 * Keeps the original fields intact and adds aliases.
 */
const normalizeItem = (item) => {
  if (!item || typeof item !== "object") return item;
  if (Array.isArray(item)) return item.map(normalizeItem);
  const out = { ...item };

  // Block fields: transactioncount → txcount
  if ("transactioncount" in out && !("txcount" in out)) {
    out.txcount = out.transactioncount;
  }

  // Handle camelCase from DB
  if ("networkFee" in out && !("netfee" in out)) {
    out.netfee = out.networkFee;
  }
  if ("systemFee" in out && !("sysfee" in out)) {
    out.sysfee = out.systemFee;
  }
  if ("nextConsensus" in out && !("nextconsensus" in out)) {
    out.nextconsensus = out.nextConsensus;
  }

  // Block fields: nextconsensus → speaker (fee recipient)
  if ("nextconsensus" in out && !("speaker" in out)) {
    out.speaker = out.nextconsensus;
  }

  return out;
};

/**
 * Format neo3fura list response to standard format
 * @param {any} result - Raw API result
 * @returns {{ result: Array, totalCount: number }}
 */
export const formatListResponse = (result) => {
  if (!result) return { result: [], totalCount: 0 };

  // Handle array response
  if (Array.isArray(result)) {
    return { result: result.map(normalizeItem), totalCount: result.length };
  }

  // Handle object with result/totalCount
  if (result.result !== undefined) {
    const items = Array.isArray(result.result) ? result.result : [];
    return {
      result: items.map(normalizeItem),
      totalCount: result.totalCount || 0,
    };
  }

  return { result: [], totalCount: 0 };
};

/**
 * Safe RPC wrapper for list endpoints with error handling
 * @param {string} method - RPC method name
 * @param {object|Array} params - RPC parameters
 * @param {string} errorMsg - Error message prefix
 * @returns {Promise<{result: Array, totalCount: number}>}
 */
export const safeRpcList = async (method, params = [], errorMsg = "API call", { signal, throwOnError } = {}) => {
  void errorMsg;
  try {
    const result = await rpc(method, params, { signal, suppressLog: true });
    return formatListResponse(result);
  } catch (error) {
    if (signal?.aborted || throwOnError) throw error;
    return { result: [], totalCount: 0 };
  }
};

export default api;
