import { getCache, setCache } from "@/services/cache";

export const NEOX_HOME_FEED_ROWS = 6;

const HOME_FEED_TTL_MS = 15 * 60 * 1000;
const FEED_KINDS = new Set(["blocks", "transactions"]);

const cacheKey = (net, kind) => `neox:${String(net || "unknown")}:home-feed:${kind}:v1`;

function rowKey(row, kind) {
  if (!row || typeof row !== "object") return "";
  if (kind === "blocks") {
    if (row.hash) return String(row.hash).toLowerCase();
    return Number.isSafeInteger(Number(row.index)) ? `height:${Number(row.index)}` : "";
  }
  return row.hash ? String(row.hash).toLowerCase() : "";
}

function compareRows(left, right, kind) {
  if (kind === "blocks") return Number(right.index || 0) - Number(left.index || 0);

  const timestampDelta = Number(right.timestampMs || 0) - Number(left.timestampMs || 0);
  if (timestampDelta) return timestampDelta;
  const blockDelta = Number(right.blockIndex || 0) - Number(left.blockIndex || 0);
  if (blockDelta) return blockDelta;
  return Number(right.position || 0) - Number(left.position || 0);
}

function assertKind(kind) {
  if (!FEED_KINDS.has(kind)) throw new TypeError(`Unsupported Neo X home feed kind: ${kind}`);
}

/** Merge newest snapshots with retained history, deduplicated and newest first. */
export function mergeHomeFeedRows(incoming, retained, kind, limit = NEOX_HOME_FEED_ROWS) {
  assertKind(kind);
  const cap = Math.max(1, Math.min(50, Number(limit) || NEOX_HOME_FEED_ROWS));
  const unique = new Map();

  for (const row of [...(Array.isArray(incoming) ? incoming : []), ...(Array.isArray(retained) ? retained : [])]) {
    const key = rowKey(row, kind);
    if (key && !unique.has(key)) unique.set(key, row);
  }

  return [...unique.values()].sort((left, right) => compareRows(left, right, kind)).slice(0, cap);
}

export function readHomeFeed(net, kind, limit = NEOX_HOME_FEED_ROWS) {
  assertKind(kind);
  return mergeHomeFeedRows([], getCache(cacheKey(net, kind)), kind, limit);
}

export function writeHomeFeed(net, kind, rows, limit = NEOX_HOME_FEED_ROWS) {
  const next = mergeHomeFeedRows(rows, readHomeFeed(net, kind, limit), kind, limit);
  // Home rows do not consume the large raw Blockscout payload. Omitting it
  // keeps the session cache compact while retaining every displayed field.
  const compact = next.map(({ raw: _raw, ...row }) => row);
  setCache(cacheKey(net, kind), compact, HOME_FEED_TTL_MS);
  return next;
}

/** Preserve object identity for rows that remain visible during a refresh. */
export function reconcileHomeFeed(current, incoming, kind, limit = NEOX_HOME_FEED_ROWS) {
  const merged = mergeHomeFeedRows(incoming, current, kind, limit);
  const existing = new Map(
    (Array.isArray(current) ? current : []).map((row) => [rowKey(row, kind), row]),
  );
  return merged.map((row) => {
    const previous = existing.get(rowKey(row, kind));
    return previous ? Object.assign(previous, row) : row;
  });
}

