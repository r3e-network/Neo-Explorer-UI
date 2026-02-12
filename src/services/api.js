import axios from "axios";
import { getRpcApiBasePath } from "../utils/env";

const LEGACY_RPC_BASE_URL = "/api";

const normalizeBaseUrl = (baseUrl) => {
  if (typeof baseUrl !== "string") return "";

  return baseUrl.trim().replace(/\/+$/, "");
};

const configuredRpcBaseUrl = normalizeBaseUrl(process.env.VUE_APP_RPC_BASE_URL || "");

const useConfiguredBaseUrl = Boolean(configuredRpcBaseUrl && configuredRpcBaseUrl !== LEGACY_RPC_BASE_URL);

const resolveRpcBaseUrl = () => {
  if (useConfiguredBaseUrl) {
    return configuredRpcBaseUrl;
  }

  return getRpcApiBasePath();
};

// Create axios instance with default config
const api = axios.create({
  baseURL: resolveRpcBaseUrl(),
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    config.baseURL = resolveRpcBaseUrl();
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (process.env.NODE_ENV !== "production") console.error("API Error:", error.message);
    return Promise.reject(error);
  }
);

// Incrementing RPC ID for unique request identification
let _rpcId = 0;

// Base RPC call
export const rpc = async (method, params = {}) => {
  try {
    const response = await api.post("", {
      jsonrpc: "2.0",
      id: ++_rpcId,
      method,
      params,
    });
    if (response.data?.error) {
      const rpcErr = response.data.error;
      throw new Error(`RPC Error ${rpcErr.code || ""}: ${rpcErr.message || "Unknown RPC error"}`);
    }
    return response.data?.result;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error(`RPC Error [${method}]:`, error);
    throw error;
  }
};

/**
 * Safe RPC wrapper with error handling and default value
 * @param {string} method - RPC method name
 * @param {object} params - RPC parameters
 * @param {any} defaultValue - Default value on error
 * @returns {Promise<any>}
 */
export const safeRpc = async (method, params = {}, defaultValue = null) => {
  try {
    const result = await rpc(method, params);
    const normalized = normalizeItem(result);
    return normalized ?? defaultValue;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error(`SafeRPC Error [${method}]:`, error.message);
    return defaultValue;
  }
};

/**
 * Normalize neo3fura field names to the format our components expect.
 * Keeps the original fields intact and adds aliases.
 */
const normalizeItem = (item) => {
  if (!item || typeof item !== "object") return item;
  const out = { ...item };

  // Block fields: transactioncount → txcount
  if ("transactioncount" in out && !("txcount" in out)) {
    out.txcount = out.transactioncount;
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
 * @param {object} params - RPC parameters
 * @param {string} errorMsg - Error message prefix
 * @returns {Promise<{result: Array, totalCount: number}>}
 */
export const safeRpcList = async (method, params = {}, errorMsg = "API call") => {
  try {
    const result = await rpc(method, params);
    return formatListResponse(result);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error(`Failed to ${errorMsg}:`, error.message);
    return { result: [], totalCount: 0 };
  }
};

export default api;
