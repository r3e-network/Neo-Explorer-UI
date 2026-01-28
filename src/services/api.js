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

export default api;
