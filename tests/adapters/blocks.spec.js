import { describe, it, expect } from "vitest";
import {
  indexerToBlock,
  rpcToBlock,
  indexerToBlockPage,
  rpcToBlockPage,
  toLegacyBlockView,
  toHomeBlockView,
} from "../../src/adapters/blocks.js";
import { fetchWithPolicy, SourceUnavailableError } from "../../src/adapters/source.js";

/**
 * Reference implementation of the ORIGINAL blockService `_mapIndexerBlock`
 * normalizer, copied verbatim from before the ACL refactor. The adapter +
 * toLegacyBlockView must reproduce this output byte-for-byte for the same
 * input, which is the backward-compatibility contract for
 * blockService.getList consumers.
 */
function legacyMapIndexerBlock(b = {}) {
  const index = Number(b.index ?? b.block_index ?? b.blockindex ?? 0);
  const txCount = Number(
    b.txcount ??
      b.transactioncount ??
      b.txCount ??
      b.transactionCount ??
      b.tx_count ??
      b.transaction_count ??
      (Array.isArray(b.tx) ? b.tx.length : 0),
  );
  const timestamp = Number(b.timestamp ?? b.time_ms ?? b.time ?? b.blocktime ?? b.block_time_ms ?? 0);
  return {
    ...b,
    hash: b.hash || "",
    index: Number.isFinite(index) ? index : 0,
    timestamp: Number.isFinite(timestamp) ? timestamp : 0,
    txcount: Number.isFinite(txCount) ? txCount : 0,
    transactioncount: Number.isFinite(txCount) ? txCount : 0,
    primary: b.primary ?? b.primary_node,
    nextconsensus: b.nextconsensus ?? b.next_consensus,
    speaker: b.speaker ?? b.nextconsensus ?? b.next_consensus,
    prevhash: b.prevhash ?? b.previousblockhash ?? b.previous_block_hash,
  };
}

/**
 * Reference implementation of the ORIGINAL HomePage `normalizeBlockSummary`
 * normalizer, copied verbatim. toHomeBlockView(rpcToBlock(x)) must reproduce
 * it for the same input so HomePage renders identically.
 */
function legacyNormalizeBlockSummary(block = {}) {
  const index = Number(block.index ?? block.blockindex ?? block.block_index ?? block.height ?? 0);
  const txCount = Number(
    block.txcount ??
      block.transactioncount ??
      block.txCount ??
      block.transactionCount ??
      block.tx_count ??
      block.transaction_count ??
      block.txs ??
      (Array.isArray(block.tx) ? block.tx.length : 0),
  );
  const timestamp = Number(block.timestamp ?? block.blocktime ?? block.time ?? block.time_ms ?? 0);
  return {
    ...block,
    hash: block.hash || block.blockhash || "",
    index: Number.isFinite(index) ? index : 0,
    timestamp: Number.isFinite(timestamp) ? timestamp : 0,
    txcount: Number.isFinite(txCount) ? txCount : 0,
    transactioncount: Number.isFinite(txCount) ? txCount : 0,
    primary: block.primary ?? block.primary_node,
    netfee: block.netfee ?? block.networkFee ?? block.net_fee ?? block.totalNetFee,
    sysfee: block.sysfee ?? block.systemFee ?? block.sys_fee ?? block.totalSysFee,
    tx: block.tx || [],
    nextconsensus:
      block.nextconsensus ?? block.nextConsensus ?? block.next_consensus ?? block.speaker ?? block.validator,
    speaker: block.speaker ?? block.nextconsensus ?? block.nextConsensus ?? block.validator,
    validator: block.validator ?? block.speaker ?? block.nextconsensus ?? block.nextConsensus,
  };
}

// Representative indexer (snake_case) row ported from
// tests/services/blockService.spec.js (the indexer-first migration case).
const INDEXER_ROW = {
  hash: "0xabc",
  block_index: 5_000_000,
  time_ms: 1_700_000_000_000,
  tx_count: 7,
  primary_node: 3,
  next_consensus: "NfooBar",
  previous_block_hash: "0xprev",
  size: 1234,
  version: 0,
};

// Representative legacy/RPC row ported from the getByHash test (standard
// getblock fields: lowercase, `time`, `previousblockhash`, inline `tx`).
const RPC_ROW = {
  hash: "0xdef",
  index: 100,
  time: 1_700_000_000_000,
  previousblockhash: "0xprevrpc",
  nextblockhash: "0xnext",
  nextconsensus: "0xspeaker",
  primary: 2,
  tx: [{ hash: "0xtx1" }, { hash: "0xtx2" }],
  size: 999,
};

describe("blocks adapter — canonical model", () => {
  it("indexerToBlock coalesces snake_case fields into the canonical shape", () => {
    expect(indexerToBlock(INDEXER_ROW)).toEqual({
      hash: "0xabc",
      index: 5_000_000,
      timestampMs: 1_700_000_000_000,
      txCount: 7,
      sysFee: undefined,
      netFee: undefined,
      primary: 3,
      nextConsensus: "NfooBar",
      prevHash: "0xprev",
      raw: INDEXER_ROW,
    });
  });

  it("rpcToBlock coalesces RPC/lowercase fields into the canonical shape", () => {
    expect(rpcToBlock(RPC_ROW)).toEqual({
      hash: "0xdef",
      index: 100,
      timestampMs: 1_700_000_000_000,
      txCount: 2, // derived from inline tx array
      sysFee: undefined,
      netFee: undefined,
      primary: 2,
      nextConsensus: "0xspeaker",
      prevHash: "0xprevrpc",
      raw: RPC_ROW,
    });
  });

  it("returns null for non-object input", () => {
    expect(indexerToBlock(null)).toBeNull();
    expect(rpcToBlock(undefined)).toBeNull();
    expect(rpcToBlock("nope")).toBeNull();
  });

  it("coalesces missing fields: camelCase txCount / sysfee aliases", () => {
    const block = rpcToBlock({
      hash: "0x9",
      blockIndex: 42,
      transactionCount: 5,
      systemFee: "300",
      networkFee: "30",
    });
    expect(block).toMatchObject({
      hash: "0x9",
      index: 42,
      txCount: 5,
      sysFee: "300",
      netFee: "30",
    });
  });
});

describe("blocks adapter — toLegacyBlockView equals old _mapIndexerBlock", () => {
  it("matches for a snake_case indexer row", () => {
    const viaAcl = toLegacyBlockView(indexerToBlock(INDEXER_ROW));
    const viaOld = legacyMapIndexerBlock(INDEXER_ROW);
    expect(viaAcl).toEqual(viaOld);
  });

  it("matches for a legacy/RPC row", () => {
    const viaAcl = toLegacyBlockView(rpcToBlock(RPC_ROW));
    const viaOld = legacyMapIndexerBlock(RPC_ROW);
    expect(viaAcl).toEqual(viaOld);
  });

  it("matches for a missing-field row (coalescing fallbacks)", () => {
    const sparse = { hash: "0xsparse", block_index: 9 };
    const viaAcl = toLegacyBlockView(indexerToBlock(sparse));
    const viaOld = legacyMapIndexerBlock(sparse);
    expect(viaAcl).toEqual(viaOld);
    // txcount/timestamp default to 0; consensus aliases undefined.
    expect(viaAcl).toMatchObject({ txcount: 0, timestamp: 0, index: 9 });
  });

  it("preserves pass-through fields (size, version) via raw spread", () => {
    const view = toLegacyBlockView(indexerToBlock(INDEXER_ROW));
    expect(view.size).toBe(1234);
    expect(view.version).toBe(0);
  });
});

describe("blocks adapter — toHomeBlockView equals old normalizeBlockSummary", () => {
  it("matches for a snake_case indexer row", () => {
    const viaAcl = toHomeBlockView(rpcToBlock(INDEXER_ROW));
    const viaOld = legacyNormalizeBlockSummary(INDEXER_ROW);
    expect(viaAcl).toEqual(viaOld);
  });

  it("matches for a legacy/RPC row with inline tx", () => {
    const viaAcl = toHomeBlockView(rpcToBlock(RPC_ROW));
    const viaOld = legacyNormalizeBlockSummary(RPC_ROW);
    expect(viaAcl).toEqual(viaOld);
  });

  it("matches for a row using blockhash + height + camelCase fees", () => {
    const altRow = {
      blockhash: "0xfromblockhash",
      height: 12,
      txs: 3,
      systemFee: "100",
      networkFee: "10",
      nextConsensus: "0xnc",
    };
    const viaAcl = toHomeBlockView(rpcToBlock(altRow));
    const viaOld = legacyNormalizeBlockSummary(altRow);
    expect(viaAcl).toEqual(viaOld);
  });
});

describe("blocks adapter — page mappers", () => {
  it("indexerToBlockPage maps an envelope to Page<Block>", () => {
    const page = indexerToBlockPage({ data: [INDEXER_ROW], paging: { total: 5_000_001 } });
    expect(page.total).toBe(5_000_001);
    expect(page.items).toHaveLength(1);
    expect(page.items[0].index).toBe(5_000_000);
  });

  it("indexerToBlockPage falls back to item count when paging.total is absent", () => {
    const page = indexerToBlockPage({ data: [INDEXER_ROW], paging: {} });
    expect(page.total).toBe(1);
  });

  it("indexerToBlockPage returns an empty page for missing data", () => {
    expect(indexerToBlockPage(null)).toEqual({ items: [], total: 0 });
    expect(indexerToBlockPage({ data: [] })).toEqual({ items: [], total: 0 });
  });

  it("rpcToBlockPage maps result/totalCount and bare arrays", () => {
    expect(rpcToBlockPage({ result: [RPC_ROW], totalCount: 9 }).total).toBe(9);
    expect(rpcToBlockPage([RPC_ROW]).items[0].hash).toBe("0xdef");
  });
});

describe("source policy — fetchWithPolicy", () => {
  it("returns the first source that yields data, adapted", async () => {
    const result = await fetchWithPolicy({
      sources: [
        { name: "a", fetch: async () => null, adapt: (r) => r },
        { name: "b", fetch: async () => ({ data: [INDEXER_ROW] }), adapt: indexerToBlockPage },
      ],
      emptyResult: { items: [], total: 0 },
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].index).toBe(5_000_000);
  });

  it("skips a throwing source and uses the next", async () => {
    const result = await fetchWithPolicy({
      sources: [
        { name: "a", fetch: async () => { throw new Error("boom"); }, adapt: (r) => r },
        { name: "b", fetch: async () => ({ data: [INDEXER_ROW] }), adapt: indexerToBlockPage },
      ],
      emptyResult: { items: [], total: 0 },
    });
    expect(result.items).toHaveLength(1);
  });

  it("returns emptyResult when all sources have no data (emptiness, not outage)", async () => {
    const result = await fetchWithPolicy({
      sources: [
        { name: "a", fetch: async () => null, adapt: (r) => r },
        { name: "b", fetch: async () => ({ data: [] }), adapt: indexerToBlockPage },
      ],
      emptyResult: { items: [], total: 0 },
    });
    expect(result).toEqual({ items: [], total: 0 });
  });

  it("throws SourceUnavailableError when ALL sources throw (outage)", async () => {
    const attempt = fetchWithPolicy({
      sources: [
        { name: "a", fetch: async () => { throw new Error("down-a"); }, adapt: (r) => r },
        { name: "b", fetch: async () => { throw new Error("down-b"); }, adapt: (r) => r },
      ],
      emptyResult: { items: [], total: 0 },
    });
    await expect(attempt).rejects.toBeInstanceOf(SourceUnavailableError);
    await expect(attempt).rejects.toMatchObject({ name: "SourceUnavailableError" });
    await expect(attempt).rejects.toHaveProperty("errors.length", 2);
  });
});
