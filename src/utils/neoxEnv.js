// Neo X (EVM sidechain) network context.
//
// Deliberately parallel to — and independent of — src/utils/env.js. The N3
// network axis (Mainnet / TestT5) and its ~57 `resolveNetworkName` callers are
// left completely untouched; Neo X carries its own net selection so the two
// chains never collide. The chain axis itself is derived from the route
// (`/x/*` prefix — see AppHeader's isNeoxRoute), not stored here.
//
// The net id strings ("neox-mainnet" / "neox-testnet") double as the cache-key
// and vue-query key `network` segment, which keeps Neo X cache entries isolated
// from N3's "mainnet" / "testnet" entries (see services/cache.js#getCacheKey
// and query/freshness.js#createExplorerQueryKey).

import { NETWORK_CHANGE_EVENT } from "./env";

export const NEOX_NET = {
  Mainnet: "neox-mainnet",
  Testnet: "neox-testnet",
};

const NEOX_STORAGE_KEY = "neo_explorer_neox_network";
const DEFAULT_NEOX_NET = NEOX_NET.Mainnet;

const NEOX_ALIASES = {
  [NEOX_NET.Mainnet]: NEOX_NET.Mainnet,
  [NEOX_NET.Testnet]: NEOX_NET.Testnet,
  mainnet: NEOX_NET.Mainnet,
  testnet: NEOX_NET.Testnet,
};

const normalizeNeoxNet = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return DEFAULT_NEOX_NET;
  return NEOX_ALIASES[raw] || DEFAULT_NEOX_NET;
};

// Chain metadata. `explorerApiPrefix` is the client-facing path the Blockscout
// proxy is mounted on (/neox/<net> → xexplorer.neo.org/api/v2 upstream).
export const NEOX_CHAINS = {
  [NEOX_NET.Mainnet]: {
    id: NEOX_NET.Mainnet,
    name: "Neo X Mainnet",
    chainId: 47763,
    nativeCurrency: { name: "GAS", symbol: "GAS", decimals: 18 },
    explorerApiPrefix: "/neox/mainnet",
    explorerBaseUrl: "https://xexplorer.neo.org",
  },
  [NEOX_NET.Testnet]: {
    id: NEOX_NET.Testnet,
    name: "Neo X Testnet",
    chainId: 12227332,
    nativeCurrency: { name: "GAS", symbol: "GAS", decimals: 18 },
    explorerApiPrefix: "/neox/testnet",
    explorerBaseUrl: "https://xt4scan.ngd.network",
  },
};

// Dropdown options for the chain switcher (rendered alongside NETWORK_OPTIONS).
export const NEOX_NETWORK_OPTIONS = [
  { id: NEOX_NET.Mainnet, name: "Neo X Mainnet", chain: "neox" },
  { id: NEOX_NET.Testnet, name: "Neo X Testnet", chain: "neox" },
];

// Neo X averages ~8.7s per block (source: xexplorer stats); poll every 6s.
const NEOX_REFRESH_INTERVAL_MS = 6 * 1000;

const canUseLocalStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const getStoredNeoxNet = () => {
  if (!canUseLocalStorage()) return null;
  try {
    const value = window.localStorage.getItem(NEOX_STORAGE_KEY);
    return value ? normalizeNeoxNet(value) : null;
  } catch (_err) {
    return null;
  }
};

export const getNeoxNet = () => getStoredNeoxNet() || DEFAULT_NEOX_NET;

export const setNeoxNet = (net) => {
  const normalized = normalizeNeoxNet(net);
  const previous = getNeoxNet();

  if (canUseLocalStorage()) {
    try {
      window.localStorage.setItem(NEOX_STORAGE_KEY, normalized);
    } catch (_err) {
      // Ignore storage write errors (private mode, quota, etc.)
    }
  }

  // Reuse the existing N3 change bus so /x views re-fetch through the shared
  // useNetworkChange composable without a second event type. The detail
  // carries `neoxNet` so listeners can tell a Neo X switch from an N3 one.
  if (typeof window !== "undefined" && normalized !== previous) {
    window.dispatchEvent(
      new CustomEvent(NETWORK_CHANGE_EVENT, {
        detail: { neoxNet: normalized },
      })
    );
  }

  return normalized;
};

export const getNeoxChain = (net = getNeoxNet()) =>
  NEOX_CHAINS[normalizeNeoxNet(net)] || NEOX_CHAINS[DEFAULT_NEOX_NET];

export const getNeoxLabel = (net) => getNeoxChain(net).name;

export const getNeoxExplorerApiPrefix = (net = getNeoxNet()) => getNeoxChain(net).explorerApiPrefix;

export const getNeoxRefreshIntervalMs = () => NEOX_REFRESH_INTERVAL_MS;

// "mainnet" | "testnet" — the segment used to build the Blockscout proxy path.
export const resolveNeoxNetName = (net = getNeoxNet()) => {
  const raw = String(net || "").toLowerCase();
  return raw.includes("test") ? "testnet" : "mainnet";
};
