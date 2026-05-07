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
      expect(api.safeRpc).toHaveBeenCalledWith("GetBestBlockHash", {}, null, expect.any(Object));
      expect(result).toBe(hash);
    });
  });

  describe("getList", () => {
    it("calls rpc with pagination params", async () => {
      const mockData = { result: [{ height: 1 }], totalCount: 100 };
      api.safeRpcList.mockResolvedValueOnce(mockData);
      
      const result = await blockService.getList(10, 5);
      expect(api.safeRpcList).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });

    it("returns empty on error", async () => {
      api.safeRpcList.mockResolvedValueOnce({ result: [], totalCount: 0 });
      const result = await blockService.getList();
      expect(result).toEqual({ result: [], totalCount: 0 });
    });

    it("does not fetch per-block details when list already includes fees and consensus", async () => {
      api.safeRpcList.mockResolvedValueOnce({
        result: [
          {
            hash: "0x1",
            index: 1,
            txcount: 1,
            sysfee: "100",
            netfee: "10",
            nextconsensus: "0xabc",
          },
        ],
        totalCount: 1,
      });

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
      api.safeRpcList.mockResolvedValueOnce({
        result: [
          {
            hash: "0x2",
            index: 2,
            txcount: 2,
            sysfee: 0,
            netfee: 0,
          },
        ],
        totalCount: 1,
      });

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
      api.safeRpcList
        .mockResolvedValueOnce({
          result: [
            {
              hash: "0x3",
              index: 3,
              txcount: 2,
              sysfee: 0,
              netfee: 0,
            },
          ],
          totalCount: 1,
        })
        .mockResolvedValueOnce({
          result: [
            { sysfee: "100", netfee: "10" },
            { systemFee: "200", networkFee: "20" },
          ],
          totalCount: 2,
        });

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
      // Block returned tx:[] so getTransactionsByHeight falls back to legacy.
      expect(api.safeRpcList).toHaveBeenLastCalledWith(
        "GetRawTransactionByBlockHeight",
        { BlockHeight: 3, Limit: 2, Skip: 0 },
        "get transactions by block height",
        expect.any(Object)
      );
      expect(result.result[0]).toMatchObject({
        sysfee: 300,
        netfee: 30,
      });
    });
  });

  describe("getByHash", () => {
    it("calls safeRpc with hash", async () => {
      const hash = "0xabc";
      api.safeRpc.mockResolvedValueOnce({ height: 100 });
      await blockService.getByHash(hash);
      expect(api.safeRpc).toHaveBeenCalledWith("GetBlockByBlockHash", { BlockHash: hash }, null, expect.any(Object));
    });
  });

  describe("getByHeight", () => {
    it("uses standard getblock RPC first (#183)", async () => {
      api.safeRpc.mockResolvedValueOnce({ hash: "0x123", index: 100 });
      const result = await blockService.getByHeight(100);
      expect(api.safeRpc).toHaveBeenCalledWith("getblock", [100, 1], null, expect.any(Object));
      expect(result).toEqual({ hash: "0x123", index: 100 });
    });

    it("falls back to legacy GetBlockByBlockHeight when standard getblock returns null", async () => {
      api.safeRpc
        .mockResolvedValueOnce(null) // getblock
        .mockResolvedValueOnce({ hash: "0xleg", index: 100 }); // GetBlockByBlockHeight
      const result = await blockService.getByHeight(100);
      expect(api.safeRpc).toHaveBeenCalledWith(
        "GetBlockByBlockHeight",
        { BlockHeight: 100 },
        null,
        expect.any(Object),
      );
      expect(result.hash).toBe("0xleg");
    });
  });

  describe("getTransactionsByHash", () => {
    it("calls safeRpcList with hash and pagination", async () => {
      const mockData = { result: [{ hash: "0x1" }], totalCount: 1 };
      api.safeRpcList.mockResolvedValueOnce(mockData);

      const result = await blockService.getTransactionsByHash("0xabc", 10, 5);
      expect(api.safeRpcList).toHaveBeenCalledWith(
        "GetRawTransactionByBlockHash",
        { BlockHash: "0xabc", Limit: 10, Skip: 5 },
        "get transactions by block hash",
        expect.any(Object)
      );
      expect(result).toEqual(mockData);
    });
  });

  describe("getTransactionsByHeight", () => {
    it("calls safeRpcList with height and pagination", async () => {
      const mockData = { result: [{ hash: "0x1" }], totalCount: 1 };
      api.safeRpcList.mockResolvedValueOnce(mockData);

      const result = await blockService.getTransactionsByHeight(123, 10, 5);
      expect(api.safeRpcList).toHaveBeenCalledWith(
        "GetRawTransactionByBlockHeight",
        { BlockHeight: 123, Limit: 10, Skip: 5 },
        "get transactions by block height",
        expect.any(Object)
      );
      expect(result).toEqual(mockData);
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

    it("getCount falls back to legacy GetBlockCount when indexer summary is empty", async () => {
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

    it("getList falls back to legacy when indexer rows empty", async () => {
      indexerReadService.getBlocks.mockResolvedValue({ data: [], paging: { total: 0 } });
      indexerReadService.getSummary.mockResolvedValue(null);
      api.safeRpcList.mockResolvedValueOnce({ result: [{ hash: "0xleg" }], totalCount: 1 });

      const result = await blockService.getList();

      expect(api.safeRpcList).toHaveBeenCalledWith(
        "GetBlockInfoList",
        expect.any(Object),
        expect.any(String),
        expect.any(Object),
      );
      expect(result.result[0].hash).toBe("0xleg");
    });
  });

});
