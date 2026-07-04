import { describe, it, expect, vi, beforeEach } from "vitest";
import { blockService } from "../../src/services/blockService.js";
import * as api from "../../src/services/api.js";
import { clearAllCache } from "../../src/services/cache.js";

// Mock api module
vi.mock("../../src/services/api.js", () => ({
  rpc: vi.fn(),
  safeRpc: vi.fn(),
  safeRpcList: vi.fn(),
  formatListResponse: vi.fn((r) => r),
}));

vi.mock("../../src/services/indexerReadService.js", () => ({
  indexerReadService: {
    getBlocks: vi.fn(),
    getSummary: vi.fn(),
  },
}));

import { indexerReadService } from "../../src/services/indexerReadService.js";

describe("blockService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("edge unavailable")));
    clearAllCache();
    // Default: indexer is unavailable so existing tests continue to
    // exercise the legacy fallback path. Indexer-first tests below
    // override these per-case.
    indexerReadService.getBlocks.mockRejectedValue(new Error("indexer offline"));
    indexerReadService.getSummary.mockRejectedValue(new Error("indexer offline"));
  });

  describe("getCount", () => {
    it("calls safeRpc with correct params", async () => {
      api.safeRpc.mockResolvedValueOnce({ "total counts": 12345 });
      const result = await blockService.getCount();
      expect(api.safeRpc).toHaveBeenCalledWith("getblockcount", [], null, expect.any(Object));
      expect(result).toBe(12345);
    });
  });

  describe("getBestHash", () => {
    it("calls safeRpc with correct params", async () => {
      const hash = "0xabc123";
      api.safeRpc.mockResolvedValueOnce(hash);
      const result = await blockService.getBestHash();
      expect(api.safeRpc).toHaveBeenCalledWith("getbestblockhash", [], null, expect.any(Object));
      expect(result).toBe(hash);
    });
  });

  describe("getList", () => {
    it("propagates the indexer outage instead of masking it as empty (#7)", async () => {
      // A read-api outage must NOT be swallowed into an empty list — the
      // page needs to render its ErrorState + retry UI, not claim the chain
      // has zero blocks. blockService.getList lets the typed outage from
      // fetchWithPolicy propagate; the legacy RPC path is not consulted.
      await expect(blockService.getList(10, 5)).rejects.toThrow();
      expect(api.safeRpcList).not.toHaveBeenCalled();
    });

    it("propagates the outage on the default page too (#7)", async () => {
      await expect(blockService.getList()).rejects.toThrow();
    });

    it("returns empty (not an outage) when the indexer responds with no rows (#7)", async () => {
      // A genuine empty page (e.g. 404 → null, or an empty data array) is
      // "no data", not an outage — resolve to the empty state so the UI
      // shows EmptyState, never the error banner.
      indexerReadService.getBlocks.mockResolvedValueOnce({ data: [], paging: { total: 0 } });
      indexerReadService.getSummary.mockResolvedValueOnce(null);

      const result = await blockService.getList(10, 0);

      expect(result).toEqual({ result: [], totalCount: 0 });
      expect(api.safeRpcList).not.toHaveBeenCalled();
    });

    it("does not fetch per-block details when list already includes fees and consensus", async () => {
      indexerReadService.getBlocks.mockResolvedValueOnce({
        data: [
          {
            hash: "0x1",
            index: 1,
            txcount: 1,
            sysfee: "100",
            netfee: "10",
            nextconsensus: "0xabc",
          },
        ],
        paging: { total: 1 },
      });
      indexerReadService.getSummary.mockResolvedValueOnce({ total_block_count: 1 });

      const result = await blockService.getList(1, 0);

      expect(api.safeRpc).not.toHaveBeenCalled();
      expect(result.result[0]).toMatchObject({
        hash: "0x1",
        index: 1,
        sysfee: "100",
        netfee: "10",
        nextconsensus: "0xabc",
      });
    });

    it("backfills aggregate fees from full block transactions when list fees are zero but txcount is non-zero", async () => {
      indexerReadService.getBlocks.mockResolvedValueOnce({
        data: [
          {
            hash: "0x2",
            block_index: 2,
            tx_count: 2,
            sysfee: 0,
            netfee: 0,
          },
        ],
        paging: { total: 1 },
      });
      indexerReadService.getSummary.mockResolvedValueOnce({ total_block_count: 1 });

      api.safeRpc.mockResolvedValueOnce({
        hash: "0x2",
        index: 2,
        tx: [
          { sysfee: 100, netfee: 10 },
          { sysfee: 200, netfee: 20 },
        ],
        primary: 0,
        nextconsensus: "0xabc",
      });

      const result = await blockService.getList(1, 0, { enrichMissingFields: true });

      // After #183, getByHeight uses standard `getblock` first.
      expect(api.safeRpc).toHaveBeenCalledWith("getblock", [2, 1], null, expect.any(Object));
      expect(result.result[0]).toMatchObject({
        sysfee: 300,
        netfee: 30,
      });
    });

    it("falls back to fetching block transactions when full block detail omits tx fees", async () => {
      indexerReadService.getBlocks.mockResolvedValueOnce({
        data: [
          {
            hash: "0x3",
            block_index: 3,
            tx_count: 2,
            sysfee: 0,
            netfee: 0,
          },
        ],
        paging: { total: 1 },
      });
      indexerReadService.getSummary.mockResolvedValueOnce({ total_block_count: 1 });

      api.safeRpc.mockResolvedValueOnce({
        hash: "0x3",
        index: 3,
        txcount: 2,
        tx: [],
        primary: 0,
        nextconsensus: "0xabc",
      });

      const result = await blockService.getList(1, 0, { enrichMissingFields: true });

      // After #183, getByHeight uses standard `getblock` first.
      expect(api.safeRpc).toHaveBeenCalledWith("getblock", [3, 1], null, expect.any(Object));
      expect(result.result[0]).toMatchObject({
        sysfee: undefined,
        netfee: undefined,
      });
    });
  });

  describe("getByHash", () => {
    it("normalizes standard getblock fields when fetching by hash", async () => {
      const hash = "0xabc";
      api.safeRpc.mockResolvedValueOnce({
        hash,
        index: 100,
        time: 1700000000000,
        previousblockhash: "0xprev",
        nextblockhash: "0xnext",
        tx: [{ hash: "0xtx" }],
      });

      const result = await blockService.getByHash(hash);

      expect(api.safeRpc).toHaveBeenCalledWith("getblock", [hash, 1], null, expect.any(Object));
      expect(result).toMatchObject({
        hash,
        index: 100,
        timestamp: 1700000000000,
        txcount: 1,
        transactioncount: 1,
        prevhash: "0xprev",
        nextblockhash: "0xnext",
      });
    });
  });

  describe("getByHeight", () => {
    it("uses standard getblock RPC first (#183)", async () => {
      api.safeRpc.mockResolvedValueOnce({
        hash: "0x123",
        index: 100,
        time: 1700000000000,
        previousblockhash: "0xprev",
        tx: [],
      });
      const result = await blockService.getByHeight(100);
      expect(api.safeRpc).toHaveBeenCalledWith("getblock", [100, 1], null, expect.any(Object));
      expect(result).toMatchObject({
        hash: "0x123",
        index: 100,
        timestamp: 1700000000000,
        txcount: 0,
        transactioncount: 0,
        prevhash: "0xprev",
      });
    });

    it("returns null without legacy fallback when standard getblock returns null", async () => {
      api.safeRpc.mockResolvedValueOnce(null);
      const result = await blockService.getByHeight(100);
      expect(api.safeRpc).not.toHaveBeenCalledWith("GetBlockByBlockHeight", expect.anything(), expect.anything(), expect.anything());
      expect(result).toBeNull();
    });
  });

  describe("getTransactionsByHash", () => {
    it("derives transactions from standard getblock(hash)", async () => {
      api.safeRpc.mockResolvedValueOnce({ hash: "0xabc", tx: [{ hash: "0x1" }] });

      const result = await blockService.getTransactionsByHash("0xabc", 10, 5);
      expect(api.safeRpcList).not.toHaveBeenCalled();
      expect(result).toEqual({ result: [], totalCount: 1 });
    });
  });

  describe("getTransactionsByHeight", () => {
    it("derives transactions from standard getblock(height)", async () => {
      api.safeRpc.mockResolvedValueOnce({ hash: "0xabc", index: 123, tx: [{ hash: "0x1" }] });

      const result = await blockService.getTransactionsByHeight(123, 10, 0);
      expect(api.safeRpcList).not.toHaveBeenCalled();
      expect(result).toEqual({ result: [{ hash: "0x1" }], totalCount: 1 });
    });
  });

  describe("validated state roots", () => {
    it("uses the Worker getvalidatedstateroot helper when available", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            index: 100,
            roothash: "0xstate",
            validated: true,
            localrootindex: 101,
            validatedrootindex: 100,
            lag: 1,
          },
        }),
      });

      const result = await blockService.getValidatedStateRoot();

      expect(fetch).toHaveBeenCalledWith(
        "/api/mainnet",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getvalidatedstateroot",
            params: { WithWitnesses: false },
          }),
        }),
      );
      expect(api.safeRpc).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        roothash: "0xstate",
        stateroot: "0xstate",
        validated: true,
        localrootindex: 101,
        validatedrootindex: 100,
        lag: 1,
      });
    });

    it("falls back to getstateheight plus getstateroot when the Worker helper is unavailable", async () => {
      api.safeRpc
        .mockResolvedValueOnce({ localrootindex: 51, validatedrootindex: 50 })
        .mockResolvedValueOnce({ index: 50, roothash: "0xvalidated" });

      const result = await blockService.getValidatedStateRoot();

      expect(fetch).toHaveBeenCalledWith("/api/mainnet", expect.any(Object));
      expect(api.safeRpc).toHaveBeenNthCalledWith(1, "getstateheight", [], null, expect.any(Object));
      expect(api.safeRpc).toHaveBeenNthCalledWith(2, "getstateroot", [50], null, expect.any(Object));
      expect(result).toMatchObject({
        roothash: "0xvalidated",
        validated: true,
        localrootindex: 51,
        validatedrootindex: 50,
      });
    });

    it("marks a block root as pending when the requested height is above validatedrootindex", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            index: 100,
            roothash: "0xstate",
            validated: true,
            localrootindex: 101,
            validatedrootindex: 100,
          },
        }),
      });

      const result = await blockService.getValidatedStateRootForBlock(101);

      expect(result).toMatchObject({
        requestedIndex: 101,
        roothash: "",
        validated: false,
        available: false,
        validatedrootindex: 100,
      });
    });
  });

  // Indexer-first migration tests (#172). Validate that when the
  // indexer returns rows, the legacy GetBlockCount / GetBlockInfoList
  // PascalCase RPCs are NOT called.
  describe("indexer-first migration", () => {
    it("getCount uses summary.total_block_count when indexer responds", async () => {
      indexerReadService.getSummary.mockResolvedValue({ total_block_count: 9999999 });

      const result = await blockService.getCount();

      expect(result).toBe(9999999);
      expect(api.safeRpc).not.toHaveBeenCalled();
    });

    it("getCount uses standard RPC first during force refreshes", async () => {
      indexerReadService.getSummary.mockResolvedValue({ total_block_count: 9999999 });
      api.safeRpc.mockResolvedValueOnce(10000003);

      const result = await blockService.getCount({ forceRefresh: true });

      expect(result).toBe(10000003);
      expect(api.safeRpc).toHaveBeenCalledWith(
        "getblockcount",
        [],
        null,
        expect.objectContaining({ forceRefresh: true }),
      );
      expect(indexerReadService.getSummary).not.toHaveBeenCalled();
    });

    it("getCount falls back to standard getblockcount when indexer summary is empty", async () => {
      indexerReadService.getSummary.mockResolvedValue({ total_block_count: 0 });
      api.safeRpc.mockResolvedValueOnce({ "total counts": 42 });

      const result = await blockService.getCount();

      expect(api.safeRpc).toHaveBeenCalledWith("getblockcount", [], null, expect.any(Object));
      expect(result).toBe(42);
    });

    it("getList maps indexer rows to legacy field names and skips legacy RPC", async () => {
      indexerReadService.getBlocks.mockResolvedValue({
        data: [
          {
            hash: "0xabc",
            block_index: 5_000_000,
            time_ms: 1700000000000,
            tx_count: 7,
            primary_node: 3,
            next_consensus: "NfooBar",
            previous_block_hash: "0xprev",
          },
        ],
        paging: { total: 5_000_001 },
      });
      indexerReadService.getSummary.mockResolvedValue({ total_block_count: 5_000_001 });

      const result = await blockService.getList(20, 0);

      expect(api.safeRpcList).not.toHaveBeenCalled();
      expect(result.totalCount).toBe(5_000_001);
      expect(result.result[0]).toMatchObject({
        hash: "0xabc",
        index: 5_000_000,
        timestamp: 1700000000000,
        txcount: 7,
        primary: 3,
        nextconsensus: "NfooBar",
        prevhash: "0xprev",
      });
    });

    it("getList uses summary total when paging.total absent", async () => {
      indexerReadService.getBlocks.mockResolvedValue({
        data: [{ hash: "0x1", block_index: 1, time_ms: 1, tx_count: 1 }],
        paging: {},
      });
      indexerReadService.getSummary.mockResolvedValue({ total_block_count: 12345 });

      const result = await blockService.getList();

      expect(result.totalCount).toBe(12345);
    });

    it("getList returns empty when indexer rows empty", async () => {
      indexerReadService.getBlocks.mockResolvedValue({ data: [], paging: { total: 0 } });
      indexerReadService.getSummary.mockResolvedValue(null);

      const result = await blockService.getList();

      expect(api.safeRpcList).not.toHaveBeenCalled();
      expect(result).toEqual({ result: [], totalCount: 0 });
    });
  });

});
