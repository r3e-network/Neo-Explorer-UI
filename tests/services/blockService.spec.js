import { describe, it, expect, vi, beforeEach } from "vitest";
import { blockService } from "../../src/services/blockService.js";
import * as api from "../../src/services/api.js";
import { neotubeService } from "../../src/services/neotubeService.js";
import { clearAllCache } from "../../src/services/cache.js";

// Mock api module
vi.mock("../../src/services/api.js", () => ({
  rpc: vi.fn(),
  safeRpc: vi.fn(),
  safeRpcList: vi.fn(),
  formatListResponse: vi.fn((r) => r),
}));

vi.mock("../../src/services/neotubeService.js", () => ({
  neotubeService: {
    supportsNetwork: vi.fn(() => true),
    getLatestBlocks: vi.fn(),
    getStatistics: vi.fn(),
  },
}));

describe("blockService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
    clearAllCache();
    neotubeService.supportsNetwork.mockReturnValue(true);
  });

  describe("getCount", () => {
    it("calls safeRpc with correct params", async () => {
      api.safeRpc.mockResolvedValueOnce({ "total counts": 12345 });
      const result = await blockService.getCount();
      expect(api.safeRpc).toHaveBeenCalledWith("GetBlockCount", {}, null, expect.any(Object));
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

    it("uses RPC list as primary even when NeoTube is enabled", async () => {
      api.safeRpcList.mockResolvedValueOnce({
        result: [{ hash: "0xrpc", index: 1, txcount: 2 }],
        totalCount: 1,
      });
      neotubeService.getLatestBlocks.mockResolvedValueOnce({
        result: [{ hash: "0xneo", index: 9, txcount: 9 }],
        totalCount: 1,
      });

      const result = await blockService.getList(10, 0, { useNeoTube: true });

      expect(api.safeRpcList).toHaveBeenCalled();
      expect(neotubeService.getLatestBlocks).not.toHaveBeenCalled();
      expect(result.result[0].hash).toBe("0xrpc");
    });

    it("does not fall back to NeoTube when RPC list is empty", async () => {
      api.safeRpcList.mockResolvedValueOnce({ result: [], totalCount: 0 });
      neotubeService.getLatestBlocks.mockResolvedValueOnce({
        result: [{ hash: "0xneo", index: 9, txcount: 9 }],
        totalCount: 1,
      });

      const result = await blockService.getList(10, 0, { useNeoTube: true });

      expect(api.safeRpcList).toHaveBeenCalled();
      expect(neotubeService.getLatestBlocks).not.toHaveBeenCalled();
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
    it("calls safeRpc with height", async () => {
      api.safeRpc.mockResolvedValueOnce({ hash: "0x123" });
      await blockService.getByHeight(100);
      expect(api.safeRpc).toHaveBeenCalledWith("GetBlockByBlockHeight", { BlockHeight: 100 }, null, expect.any(Object));
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

});
