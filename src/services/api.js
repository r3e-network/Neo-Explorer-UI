import axios from "axios";

// Create axios instance with default config
const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.message);
    return Promise.reject(error);
  }
);

// Base RPC call
export const rpc = async (method, params = {}) => {
  try {
    const response = await api.post("", {
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    });
    return response.data?.result;
  } catch (error) {
    console.error(`RPC Error [${method}]:`, error);
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
    return result ?? defaultValue;
  } catch (error) {
    console.error(`SafeRPC Error [${method}]:`, error.message);
    return defaultValue;
  }
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
    return { result, totalCount: result.length };
  }

  // Handle object with result/totalCount
  if (result.result !== undefined) {
    return {
      result: Array.isArray(result.result) ? result.result : [],
      totalCount: result.totalCount || 0,
    };
  }

  return { result: [], totalCount: 0 };
};

export default api;
