/**
 * Anti-corruption layer for the block resource.
 *
 * This module is the ONLY place where the various wire formats for a block
 * (indexer snake_case, RPC lowercase/camelCase, legacy Mongo payloads) are
 * coalesced into the canonical {@link module:domain/models.Block} shape, and
 * the only place that maps the canonical shape back to the legacy object shape
 * that existing components consume.
 *
 * Coalescing rules (deduped from the historical normalizers in
 * blockService.js and HomePage.vue):
 *   - txCount:       txcount | transactioncount | txCount | transactionCount |
 *                    tx_count | transaction_count | txs | tx.length
 *   - index:         index | block_index | blockindex | blockIndex | height
 *   - timestampMs:   timestamp | time_ms | block_time_ms | blocktime | time
 *   - sysFee:        sysfee | systemFee | sys_fee | totalSysFee
 *   - netFee:        netfee | networkFee | net_fee | totalNetFee
 *   - primary:       primary | primary_node | primaryNode
 *   - nextConsensus: nextconsensus | next_consensus | nextConsensus
 *   - prevHash:      prevhash | previousblockhash | previous_block_hash
 *
 * @module adapters/blocks
 */

/**
 * @typedef {import("../domain/models.js").Block} Block
 * @typedef {import("../domain/models.js").Page} Page
 */

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function coalesceTxCount(raw = {}) {
  const candidate = firstDefined(
    raw.txcount,
    raw.transactioncount,
    raw.txCount,
    raw.transactionCount,
    raw.tx_count,
    raw.transaction_count,
    raw.txs,
  );
  const n = Number(candidate);
  if (Number.isFinite(n)) return n;
  return Array.isArray(raw.tx) ? raw.tx.length : 0;
}

function coalesceIndex(raw = {}) {
  const candidate = firstDefined(raw.index, raw.block_index, raw.blockindex, raw.blockIndex, raw.height);
  const n = Number(candidate ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function coalesceTimestampMs(raw = {}) {
  const candidate = firstDefined(raw.timestamp, raw.time_ms, raw.block_time_ms, raw.blocktime, raw.time);
  const n = Number(candidate ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function coalesceSysFee(raw = {}) {
  return firstDefined(raw.sysfee, raw.systemFee, raw.sys_fee, raw.totalSysFee);
}

function coalesceNetFee(raw = {}) {
  return firstDefined(raw.netfee, raw.networkFee, raw.net_fee, raw.totalNetFee);
}

function coalescePrimary(raw = {}) {
  return firstDefined(raw.primary, raw.primary_node, raw.primaryNode);
}

function coalesceNextConsensus(raw = {}) {
  return firstDefined(raw.nextconsensus, raw.next_consensus, raw.nextConsensus);
}

function coalescePrevHash(raw = {}) {
  return firstDefined(raw.prevhash, raw.previousblockhash, raw.previous_block_hash);
}

/**
 * Build a canonical Block from any raw row. The raw row is retained on
 * `raw` so the legacy views can preserve pass-through fields (size, version,
 * merkleroot, witnesses, …) that components read directly.
 *
 * @param {Object} raw
 * @returns {Block}
 */
function toBlock(raw = {}) {
  return {
    hash: raw.hash || "",
    index: coalesceIndex(raw),
    timestampMs: coalesceTimestampMs(raw),
    txCount: coalesceTxCount(raw),
    sysFee: coalesceSysFee(raw),
    netFee: coalesceNetFee(raw),
    primary: coalescePrimary(raw),
    nextConsensus: coalesceNextConsensus(raw),
    prevHash: coalescePrevHash(raw),
    raw,
  };
}

/**
 * Adapt an indexer (snake_case) block row to the canonical Block.
 * @param {Object} raw
 * @returns {Block|null}
 */
export function indexerToBlock(raw) {
  if (!raw || typeof raw !== "object") return null;
  return toBlock(raw);
}

/**
 * Adapt an RPC / legacy block payload to the canonical Block.
 * @param {Object} raw
 * @returns {Block|null}
 */
export function rpcToBlock(raw) {
  if (!raw || typeof raw !== "object") return null;
  return toBlock(raw);
}

/**
 * Adapt an indexer list envelope (`{ data, paging }`) to a canonical page.
 * @param {Object} envelope
 * @returns {Page<Block>}
 */
export function indexerToBlockPage(envelope) {
  const rows = Array.isArray(envelope?.data) ? envelope.data : [];
  const items = rows.map(indexerToBlock).filter(Boolean);
  const pagingTotal = Number(envelope?.paging?.total);
  const total = Number.isFinite(pagingTotal) ? pagingTotal : items.length;
  return { items, total };
}

/**
 * Adapt an RPC list payload (`{ result, totalCount }` or a bare array) to a
 * canonical page.
 * @param {Object|Array} payload
 * @returns {Page<Block>}
 */
export function rpcToBlockPage(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.result)
      ? payload.result
      : [];
  const items = rows.map(rpcToBlock).filter(Boolean);
  const totalCount = Number(payload?.totalCount);
  const total = Number.isFinite(totalCount) ? totalCount : items.length;
  return { items, total };
}

/**
 * Map a canonical Block back to the EXACT legacy object shape that
 * `blockService.getList` historically returned (mirrors the old
 * `_mapIndexerBlock`). Components consuming `blockService.getList` are
 * unchanged: same field names, same value semantics.
 *
 * Reproduces `_mapIndexerBlock`:
 *   { ...raw, hash, index, timestamp, txcount, transactioncount, primary,
 *     nextconsensus, speaker, prevhash }
 * where speaker = raw.speaker ?? nextconsensus.
 *
 * @param {Block} block
 * @returns {Object}
 */
export function toLegacyBlockView(block) {
  if (!block || typeof block !== "object") return block;
  const raw = block.raw || {};
  // Reproduce `_mapIndexerBlock`'s exact alias chains off the raw row so the
  // output is byte-identical (these are intentionally narrower than the
  // canonical coalescing — e.g. nextconsensus did NOT fold in the camelCase
  // `nextConsensus`, and primary did NOT fold in `primaryNode`):
  //   primary       = primary ?? primary_node
  //   nextconsensus = nextconsensus ?? next_consensus
  //   speaker       = speaker ?? nextconsensus ?? next_consensus
  //   prevhash      = prevhash ?? previousblockhash ?? previous_block_hash
  const nextconsensus = firstDefined(raw.nextconsensus, raw.next_consensus);
  return {
    ...raw,
    hash: block.hash || "",
    index: block.index,
    timestamp: block.timestampMs,
    txcount: block.txCount,
    transactioncount: block.txCount,
    primary: firstDefined(raw.primary, raw.primary_node),
    nextconsensus,
    speaker: firstDefined(raw.speaker, raw.nextconsensus, raw.next_consensus),
    prevhash: firstDefined(raw.prevhash, raw.previousblockhash, raw.previous_block_hash),
  };
}

/**
 * Map a canonical Block back to the legacy object shape that HomePage's
 * `normalizeBlockSummary` historically produced. It is a superset of the
 * `_mapIndexerBlock` shape: it additionally coalesces sysfee/netfee, ensures
 * a `tx` array, and exposes `validator`/`speaker` consensus aliases.
 *
 * Reproduces `normalizeBlockSummary`:
 *   { ...raw, hash, index, timestamp, txcount, transactioncount, primary,
 *     netfee, sysfee, tx, nextconsensus, speaker, validator }
 *
 * @param {Block} block
 * @returns {Object}
 */
export function toHomeBlockView(block) {
  if (!block || typeof block !== "object") return block;
  const raw = block.raw || {};
  // HomePage's normalizer prefers raw.blockhash as a hash fallback.
  const hash = raw.hash || raw.blockhash || "";
  // The original consensus alias chains read the raw lowercase/camelCase
  // fields directly (NOT the coalesced canonical value), so reproduce them
  // verbatim to keep the rendered fields byte-identical:
  //   nextconsensus = nextconsensus ?? nextConsensus ?? next_consensus ?? speaker ?? validator
  //   speaker       = speaker ?? nextconsensus ?? nextConsensus ?? validator
  //   validator     = validator ?? speaker ?? nextconsensus ?? nextConsensus
  const nextconsensus = firstDefined(
    raw.nextconsensus,
    raw.nextConsensus,
    raw.next_consensus,
    raw.speaker,
    raw.validator,
  );
  const speaker = firstDefined(raw.speaker, raw.nextconsensus, raw.nextConsensus, raw.validator);
  const validator = firstDefined(raw.validator, raw.speaker, raw.nextconsensus, raw.nextConsensus);
  return {
    ...raw,
    hash,
    index: block.index,
    timestamp: block.timestampMs,
    txcount: block.txCount,
    transactioncount: block.txCount,
    primary: block.primary,
    netfee: block.netFee,
    sysfee: block.sysFee,
    tx: raw.tx || [],
    nextconsensus,
    speaker,
    validator,
  };
}
