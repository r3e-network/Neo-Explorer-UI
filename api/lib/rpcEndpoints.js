const DEFAULT_NETWORK = 'mainnet';

const PRIMARY_RPC_ENDPOINTS = Object.freeze({
  mainnet: 'https://rpc.n3index.dev/mainnet',
  testnet: 'https://testnet1.neo.coz.io',
});

const FALLBACK_RPC_ENDPOINTS = Object.freeze({
  mainnet: [
    'https://api.n3index.dev/mainnet',
  ],
  testnet: [
    'https://api.n3index.dev/testnet',
  ],
});

const PRIMARY_WS_ENDPOINTS = Object.freeze({
  mainnet: 'wss://ws.r3e.network/mainnet',
  testnet: 'wss://ws.r3e.network/testnet',
});

const FALLBACK_WS_ENDPOINTS = Object.freeze({
  mainnet: ['wss://neofura.ngd.network/ws'],
  testnet: ['wss://testmagnet.ngd.network/ws'],
});

const preferredRpcEndpointByNetwork = new Map();
const endpointNetworkCache = new Map();
const EXPECTED_NETWORK_MAGIC = Object.freeze({
  mainnet: 860833102,
  testnet: 894710606,
});
const NETWORK_VALIDATION_TIMEOUT_MS = 1200;

function resetPreferredRpcEndpointsForTests() {
  preferredRpcEndpointByNetwork.clear();
  endpointNetworkCache.clear();
}

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
  const candidates = [primary, ...fallback];
  const preferred = preferredRpcEndpointByNetwork.get(mode);
  if (!preferred) return candidates;

  const remaining = candidates.filter((candidate) => candidate !== preferred);
  return candidates.includes(preferred) ? [preferred, ...remaining] : candidates;
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

function createNetworkMismatchError(endpoint, expected, actual) {
  const error = new Error(`RPC endpoint network mismatch on ${endpoint}: expected ${expected}, got ${actual}`);
  error.code = 'RPC_NETWORK_MISMATCH';
  error.isNetworkMismatch = true;
  error.endpoint = endpoint;
  error.expectedNetworkMagic = expected;
  error.actualNetworkMagic = actual;
  return error;
}

function isNetworkMismatchError(error) {
  return error?.code === 'RPC_NETWORK_MISMATCH' || error?.isNetworkMismatch;
}

function extractNetworkMagic(payload) {
  return Number(payload?.result?.protocol?.network ?? payload?.result?.network);
}

async function validateEndpointNetwork(endpoint, network) {
  const mode = normalizeNetwork(network);
  const expected = EXPECTED_NETWORK_MAGIC[mode];
  if (!Number.isFinite(expected) || typeof fetch !== 'function') return;

  const cacheKey = `${String(endpoint || '').replace(/\/+$/, '')}::${expected}`;
  if (endpointNetworkCache.get(cacheKey)) return;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), NETWORK_VALIDATION_TIMEOUT_MS) : null;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getversion', params: [] }),
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
    if (timeout) clearTimeout(timeout);
  }
}

async function callWithRpcEndpointFallback(network, handler) {
  const mode = normalizeNetwork(network);
  const candidates = getRpcEndpointCandidates(mode);
  let lastError = null;

  for (const endpoint of candidates) {
    try {
      await validateEndpointNetwork(endpoint, mode);
      const result = await handler(endpoint);
      preferredRpcEndpointByNetwork.set(mode, endpoint);
      return result;
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
  __resetPreferredRpcEndpointsForTests: resetPreferredRpcEndpointsForTests,
};
