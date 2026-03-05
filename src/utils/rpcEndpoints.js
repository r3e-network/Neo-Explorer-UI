import { getCurrentEnv } from "./env";

const DEFAULT_NETWORK = "mainnet";

const PRIMARY_RPC_ENDPOINTS = Object.freeze({
  mainnet: "https://rpc.r3e.network/mainnet",
  testnet: "https://rpc.r3e.network/testnet",
});

const FALLBACK_RPC_ENDPOINTS = Object.freeze({
  mainnet: ["https://mainnet1.neo.coz.io:443", "https://neofura.ngd.network"],
  testnet: ["https://testnet1.neo.coz.io:443", "https://testmagnet.ngd.network"],
});

const PRIMARY_WS_ENDPOINTS = Object.freeze({
  mainnet: "wss://ws.r3e.network/mainnet",
  testnet: "wss://ws.r3e.network/testnet",
});

const FALLBACK_WS_ENDPOINTS = Object.freeze({
  mainnet: ["wss://neofura.ngd.network/ws"],
  testnet: ["wss://testmagnet.ngd.network/ws"],
});

export const toNetworkMode = (value = getCurrentEnv()) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return DEFAULT_NETWORK;
  if (raw === "testt5" || raw === "testnet") return "testnet";
  if (raw === "mainnet") return "mainnet";
  if (raw.includes("test") || raw.includes("t5")) return "testnet";
  return "mainnet";
};

export const getRpcEndpointCandidates = (value = getCurrentEnv()) => {
  const network = toNetworkMode(value);
  const primary = PRIMARY_RPC_ENDPOINTS[network] || PRIMARY_RPC_ENDPOINTS.mainnet;
  const fallback = FALLBACK_RPC_ENDPOINTS[network] || FALLBACK_RPC_ENDPOINTS.mainnet;
  return [primary, ...fallback];
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
