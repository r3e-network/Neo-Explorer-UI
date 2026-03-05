const DEFAULT_NETWORK = 'mainnet';

const PRIMARY_RPC_ENDPOINTS = Object.freeze({
  mainnet: 'https://rpc.r3e.network/mainnet',
  testnet: 'https://rpc.r3e.network/testnet',
});

const FALLBACK_RPC_ENDPOINTS = Object.freeze({
  mainnet: ['https://mainnet1.neo.coz.io:443', 'https://neofura.ngd.network'],
  testnet: ['https://testnet1.neo.coz.io:443', 'https://testmagnet.ngd.network'],
});

const PRIMARY_WS_ENDPOINTS = Object.freeze({
  mainnet: 'wss://ws.r3e.network/mainnet',
  testnet: 'wss://ws.r3e.network/testnet',
});

const FALLBACK_WS_ENDPOINTS = Object.freeze({
  mainnet: ['wss://neofura.ngd.network/ws'],
  testnet: ['wss://testmagnet.ngd.network/ws'],
});

function normalizeNetwork(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return DEFAULT_NETWORK;
  if (raw.includes('test') || raw.includes('t5')) return 'testnet';
  return 'mainnet';
}

function getRpcEndpointCandidates(network) {
  const mode = normalizeNetwork(network);
  const primary = PRIMARY_RPC_ENDPOINTS[mode] || PRIMARY_RPC_ENDPOINTS.mainnet;
  const fallback = FALLBACK_RPC_ENDPOINTS[mode] || FALLBACK_RPC_ENDPOINTS.mainnet;
  return [primary, ...fallback];
}

function getPrimaryRpcEndpoint(network) {
  return getRpcEndpointCandidates(network)[0];
}

function getWsEndpointCandidates(network) {
  const mode = normalizeNetwork(network);
  const primary = PRIMARY_WS_ENDPOINTS[mode] || PRIMARY_WS_ENDPOINTS.mainnet;
  const fallback = FALLBACK_WS_ENDPOINTS[mode] || FALLBACK_WS_ENDPOINTS.mainnet;
  return [primary, ...fallback];
}

function getPrimaryWsEndpoint(network) {
  return getWsEndpointCandidates(network)[0];
}

async function callWithRpcEndpointFallback(network, handler) {
  const candidates = getRpcEndpointCandidates(network);
  let lastError = null;

  for (const endpoint of candidates) {
    try {
      return await handler(endpoint);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('No RPC endpoint candidates available');
}

module.exports = {
  normalizeNetwork,
  getRpcEndpointCandidates,
  getPrimaryRpcEndpoint,
  getWsEndpointCandidates,
  getPrimaryWsEndpoint,
  callWithRpcEndpointFallback,
};
