/**
 * Offline, chain-aware natural-language intent + entity router.
 *
 * This is the Phase 0 fast path for the natural-language search effort: a pure,
 * deterministic, allocation-light resolver that runs only when the regex
 * identifier classifier (see `detectSearchType` in `searchRouting.js`) finds no
 * hash/address/height. It never touches the network or an LLM.
 *
 * Two strategies, tried in order:
 *   1. Entity name -> address route (chain-preferred), driven by the two known-
 *      address registries plus a small curated alias map.
 *   2. Intent keyword -> page route (chain-aware), driven by a static table.
 * A narrow cross-chain exact-label backstop runs last. Anything else -> null,
 * which lets the caller fall through to the generic `/search` results page.
 *
 * All indexes are built once at module load (module-level memoization).
 */
import { getKnownAddressEntries } from "@/constants/knownAddresses";
import { NEOX_KNOWN_ADDRESSES } from "@/constants/neoxKnownAddresses";

const normalize = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

/**
 * A token is specific enough to match on when it is at least three characters
 * long, or when it contains any non-ASCII (e.g. CJK) character — a two-character
 * Chinese keyword such as "国库" carries as much meaning as an English word.
 */
const isSpecific = (token) => token.length >= 3 || /[^ -~]/.test(token);

/**
 * Whether the query is a bare identifier that the regex classifier already
 * owns. Checked against the original-case string (base58/hex are case aware).
 */
function looksLikeIdentifier(value) {
  if (/^0x[0-9a-fA-F]+$/.test(value)) return true; // 0x-prefixed hex
  if (/^[0-9a-fA-F]{40}$/.test(value)) return true; // bare script hash
  if (/^[0-9a-fA-F]{64}$/.test(value)) return true; // bare tx/block hash
  if (/^\d+$/.test(value)) return true; // block height
  if (/^N[1-9A-HJ-NP-Za-km-z]{33}$/.test(value)) return true; // N3 base58 address
  if (value.endsWith(".neo") && value.length > 4) return true; // NNS domain
  if (value.endsWith(".matrix") && value.length > 7) return true; // NNS domain
  return false;
}

// ── Neo X label index (normalized label -> preferred-network address) ────────
const NEOX_LABEL_INDEX = (() => {
  const rankOf = (network) => (network === "both" ? 0 : network === "mainnet" ? 1 : 2);
  const index = new Map();
  for (const { address, network, label } of NEOX_KNOWN_ADDRESSES) {
    const key = normalize(label);
    const rank = rankOf(network);
    const existing = index.get(key);
    if (!existing || rank < existing.rank) index.set(key, { address, rank });
  }
  return index;
})();

const NEOX_LABEL_LIST = [...NEOX_LABEL_INDEX.entries()].map(([norm, value]) => ({
  norm,
  address: value.address,
}));

// ── Neo N3 name index (normalized name -> first address for that name) ───────
const { N3_NAME_INDEX, N3_NAME_LIST } = (() => {
  const index = new Map();
  const list = [];
  for (const { address, name } of getKnownAddressEntries()) {
    const key = normalize(name);
    if (!key || index.has(key)) continue;
    index.set(key, address);
    list.push({ norm: key, address });
  }
  return { N3_NAME_INDEX: index, N3_NAME_LIST: list };
})();

// ── Curated alias maps (alias token -> registry label) ───────────────────────
// Longest matching token wins, so "bridge management" beats bare "bridge".
const NEOX_ALIASES = [
  { token: "bridge management", label: "Bridge Management" },
  { token: "跨链桥", label: "Neo X Bridge (TokenBridge)" },
  { token: "bridge", label: "Neo X Bridge (TokenBridge)" },
  { token: "treasury", label: "Treasury" },
  { token: "国库", label: "Treasury" },
  { token: "committee", label: "Committee MultiSig" },
  { token: "委员会", label: "Committee MultiSig" },
  { token: "wrapped gas", label: "Wrapped GAS (WGAS10)" },
  { token: "wgas", label: "Wrapped GAS (WGAS10)" },
  { token: "oracle", label: "Neo Oracle Gateway Proxy" },
  { token: "预言机", label: "Neo Oracle Gateway Proxy" },
];

const N3_ALIASES = [
  { token: "da hongfei", label: "Neo Foundation (Da Hongfei)" },
  { token: "neo foundation", label: "Neo Foundation (Da Hongfei)" },
  { token: "erik zhang", label: "Neo Foundation (Erik Zhang)" },
  { token: "nf1", label: "NF1 (Erik Zhang)" },
  { token: "nf2", label: "NF2 (Erik Zhang)" },
  { token: "nf3", label: "NF3 (Erik Zhang)" },
  { token: "nf4", label: "NF4 (Erik Zhang)" },
  { token: "nf5", label: "NF5 (Erik Zhang)" },
  { token: "nf6", label: "NF6 (Erik Zhang)" },
  { token: "nf7", label: "NF7 (Erik Zhang)" },
];

// Generic single-word labels that collide with intent keywords and must resolve
// through Strategy 2 (page route) rather than as an entity address.
const RESERVED_GENERIC = new Set(["governance"]);

// ── Intent table (keyword triggers -> per-chain page route) ──────────────────
// `cross: true` lets the active chain fall back to the other chain's route when
// the intent is a concept that only exists there (e.g. anti-MEV is Neo X only).
// Ordering matters: more specific intents precede broader ones so that, for
// example, "共识状态" resolves to consensus status rather than validators.
const INTENTS = [
  { match: ["共识状态", "consensus status", "network health"], n3: "/consensus-status", x: null },
  { match: ["网络状态", "network status"], n3: "/network-status", x: null },
  { match: ["anti-mev", "antimev", "mev", "信封"], n3: null, x: "/x/anti-mev", cross: true },
  { match: ["gas price", "gas tracker", "gas 价格", "gas 费", "gas fee", "gasprice"], n3: "/gas-tracker", x: "/x/charts" },
  { match: ["最新区块", "latest blocks", "blocks", "区块", "block"], n3: "/blocks/1", x: "/x/blocks" },
  { match: ["最新交易", "latest transactions", "transactions", "交易", "transaction", "txns"], n3: "/transactions/1", x: "/x/transactions" },
  { match: ["余额最高", "账户排行", "富豪榜", "richest accounts", "richest", "top accounts", "top holders", "holders"], n3: "/account/1", x: "/x/accounts" },
  { match: ["代币", "tokens", "token"], n3: "/tokens/nep17/1", x: "/x/tokens" },
  { match: ["合约", "contracts", "contract"], n3: "/contracts/1", x: "/x/contracts" },
  { match: ["图表", "统计", "charts", "statistics", "analytics", "chart", "stats"], n3: "/echarts", x: "/x/charts" },
  { match: ["验证人", "共识", "节点", "validators", "consensus nodes", "validator", "consensus node"], n3: "/candidates/1", x: "/x/labels" },
  { match: ["治理", "governance"], n3: "/governance", x: "/x/labels" },
  { match: ["销毁", "burned gas", "burn", "gas burn"], n3: "/burn", x: null },
  { match: ["标签", "labels", "directory", "label"], n3: null, x: "/x/labels" },
  { match: ["国库", "treasury"], n3: "/treasury", x: null },
];

/** Strategy 1: resolve an entity name on the active chain to an address route. */
function resolveEntity(q, isNeox) {
  const aliases = isNeox ? NEOX_ALIASES : N3_ALIASES;
  const index = isNeox ? NEOX_LABEL_INDEX : N3_NAME_INDEX;
  const list = isNeox ? NEOX_LABEL_LIST : N3_NAME_LIST;
  const prefix = isNeox ? "/x/address/" : "/account-profile/";
  const addressOf = (entry) => (isNeox ? entry?.address : entry);

  // 1a. Curated alias map — pick the longest matched alias token.
  let bestAlias = null;
  for (const alias of aliases) {
    if (isSpecific(alias.token) && q.includes(alias.token)) {
      if (!bestAlias || alias.token.length > bestAlias.token.length) bestAlias = alias;
    }
  }
  if (bestAlias) {
    const address = addressOf(index.get(normalize(bestAlias.label)));
    if (address) return `${prefix}${address}`;
  }

  // 1b. Generic label/name substring — pick the longest matched entry.
  let bestEntry = null;
  for (const entry of list) {
    if (entry.norm.length < 3 || RESERVED_GENERIC.has(entry.norm)) continue;
    if (q.includes(entry.norm) && (!bestEntry || entry.norm.length > bestEntry.norm.length)) {
      bestEntry = entry;
    }
  }
  if (bestEntry) return `${prefix}${bestEntry.address}`;

  return null;
}

/** Strategy 2: resolve an intent keyword to a chain-appropriate page route. */
function resolveIntent(q, isNeox) {
  for (const intent of INTENTS) {
    if (!intent.match.some((token) => isSpecific(token) && q.includes(token))) continue;
    const primary = isNeox ? intent.x : intent.n3;
    if (primary) return { path: primary };
    if (intent.cross) {
      const other = isNeox ? intent.n3 : intent.x;
      if (other) return { path: other };
    }
    // Intent recognized but not routable on this chain — keep scanning so a
    // later, routable intent in the same query can still win.
  }
  return null;
}

/**
 * Narrow cross-chain backstop: only an exact normalized label/name match on the
 * other chain resolves, and only after Strategy 2 (so intent keywords win).
 */
function resolveEntityExact(q, isNeox) {
  if (isNeox) {
    const address = N3_NAME_INDEX.get(q);
    return address ? `/account-profile/${address}` : null;
  }
  const entry = NEOX_LABEL_INDEX.get(q);
  return entry ? `/x/address/${entry.address}` : null;
}

/**
 * Resolve a natural-language query into a router location.
 *
 * @param {string} query - Raw user search input.
 * @param {{ chain?: "n3" | "neox" }} [options] - Active chain context.
 * @returns {{ path: string, query?: Record<string, string> } | null}
 */
export function resolveNlIntent(query, { chain = "n3" } = {}) {
  const normalized = String(query || "").trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  if (looksLikeIdentifier(normalized)) return null;

  const q = normalized.toLowerCase();
  const isNeox = chain === "neox";

  const entity = resolveEntity(q, isNeox);
  if (entity) return { path: entity };

  const intent = resolveIntent(q, isNeox);
  if (intent) return intent;

  const crossEntity = resolveEntityExact(q, isNeox);
  if (crossEntity) return { path: crossEntity };

  return null;
}
