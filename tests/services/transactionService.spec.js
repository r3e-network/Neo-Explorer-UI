import { describe, it, expect, vi, beforeEach } from "vitest";
import { transactionService } from "../../src/services/transactionService.js";
import * as api from "../../src/services/api.js";
import { accountService } from "../../src/services/accountService.js";
import { neotubeService } from "../../src/services/neotubeService.js";
import { clearAllCache } from "../../src/services/cache.js";

vi.mock("@cityofzion/neon-js", () => ({
  rpc: {
    RPCClient: vi.fn().mockImplementation(() => ({
      getRawTransaction: vi.fn().mockRejectedValue(new Error("Mock network error")),
      getBlockHeader: vi.fn().mockRejectedValue(new Error("Mock network error")),
    })),
  },
}));

vi.mock("../../src/services/api.js", () => ({
  rpc: vi.fn(),
  safeRpc: vi.fn(),
  safeRpcList: vi.fn(),
  formatListResponse: vi.fn((r) => r),
}));

vi.mock("../../src/services/supabaseService.js", () => ({
  supabaseService: {
    getMempoolTransactions: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../../src/services/accountService.js", () => ({
  accountService: {
    getNep17Transfers: vi.fn(),
    getNep11Transfers: vi.fn(),
  },
}));

vi.mock("../../src/services/neotubeService.js", () => ({
  neotubeService: {
    supportsNetwork: vi.fn(() => true),
    getLatestTransactions: vi.fn(),
    getStatistics: vi.fn(),
  },
}));

describe("transactionService", () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.resetAllMocks();
    clearAllCache();
    neotubeService.supportsNetwork.mockReturnValue(true);
  });

  describe("getCount", () => {
    it("calls safeRpc correctly", async () => {
      api.safeRpc.mockResolvedValueOnce(50000);
      const result = await transactionService.getCount();
      expect(api.safeRpc).toHaveBeenCalledWith("GetTransactionCount", {}, 0, expect.any(Object));
      expect(result).toBe(50000);
    });

    it("uses RPC count as primary even when NeoTube is enabled", async () => {
      api.safeRpc.mockResolvedValueOnce(1234);
      neotubeService.getStatistics.mockResolvedValueOnce({ txs: 8888 });

      const result = await transactionService.getCount({ useNeoTube: true });

      expect(api.safeRpc).toHaveBeenCalled();
      expect(neotubeService.getStatistics).not.toHaveBeenCalled();
      expect(result).toBe(1234);
    });
  });

  describe("getList", () => {
    it("calls rpc with pagination and backfills vmstate", async () => {
      const mockData = { result: [{ hash: "0xTest" }, { hash: "0x2", vmstate: "HALT" }], totalCount: 2 };
      api.safeRpcList.mockResolvedValueOnce(mockData);
      
      // Mock the getByHash internal call
      api.safeRpc.mockResolvedValueOnce({ hash: "0xTest", vmstate: "FAULT" });
      
      const result = await transactionService.getList(10, 5, { enrichMissingFields: true });
      expect(api.safeRpcList).toHaveBeenCalled();
      
      // Check if it backfilled the missing vmstate for 0x1
      expect(result.result[0].vmstate).toBe("FAULT");
      // Check if it preserved the existing vmstate for 0x2
      expect(result.result[1].vmstate).toBe("HALT");
    });

    it("returns empty on error", async () => {
      api.safeRpcList.mockResolvedValueOnce({ result: [], totalCount: 0 });
      const result = await transactionService.getList();
      expect(result).toEqual({ result: [], totalCount: 0 });
    });

    it("does not default missing enriched vmstate to HALT", async () => {
      api.safeRpcList.mockResolvedValueOnce({ result: [{ hash: "0xNoState" }], totalCount: 1 });
      api.safeRpc.mockResolvedValueOnce({ hash: "0xNoState" });

      const result = await transactionService.getList(10, 0, { enrichMissingFields: true });

      expect(result.result[0].vmstate).toBeUndefined();
    });

    it("uses RPC transaction list as primary even when NeoTube is enabled", async () => {
      api.safeRpcList.mockResolvedValueOnce({
        result: [{ hash: "0xrpc" }],
        totalCount: 1,
      });
      neotubeService.getLatestTransactions.mockResolvedValueOnce({
        result: [{ hash: "0xneo" }],
        totalCount: 1,
      });

      const result = await transactionService.getList(10, 0, { useNeoTube: true });

      expect(api.safeRpcList).toHaveBeenCalled();
      expect(neotubeService.getLatestTransactions).not.toHaveBeenCalled();
      expect(result.result[0].hash).toBe("0xrpc");
    });

    it("does not fall back to NeoTube transactions when RPC list is empty", async () => {
      api.safeRpcList.mockResolvedValueOnce({ result: [], totalCount: 0 });
      neotubeService.getLatestTransactions.mockResolvedValueOnce({
        result: [{ hash: "0xneo" }],
        totalCount: 1,
      });

      const result = await transactionService.getList(10, 0, { useNeoTube: true });

      expect(api.safeRpcList).toHaveBeenCalled();
      expect(neotubeService.getLatestTransactions).not.toHaveBeenCalled();
      expect(result).toEqual({ result: [], totalCount: 0 });
    });
  });

  describe("getByHash", () => {
    it("calls safeRpc with hash", async () => {
      const hash = "0xabc123";
      api.safeRpc.mockResolvedValueOnce({ sender: "addr1" });
      await transactionService.getByHash(hash);
      expect(api.safeRpc).toHaveBeenCalledWith(
        "GetRawTransactionByTransactionHash",
        { TransactionHash: hash },
        null,
        expect.any(Object)
      );
    });
  });

  describe("getByAddress", () => {
    it("calls rpc with address and pagination and backfills vmstate", async () => {
      const mockData = { result: [{ hash: "0xAnother" }], totalCount: 1 };
      api.safeRpcList.mockResolvedValueOnce(mockData);
      api.safeRpc.mockResolvedValueOnce({ hash: "0xAnother", vmstate: "HALT" });
      
      const result = await transactionService.getByAddress("0xNAddr", 15, 10, { enrichMissingFields: true });
      expect(api.safeRpcList).toHaveBeenCalledWith(
        "GetRawTransactionByAddress",
        { Address: "0xNAddr", Limit: 15, Skip: 10 },
        "get transactions by address",
        expect.any(Object)
      );
      
      expect(result.result[0].vmstate).toBe("HALT");
    });

    it("falls back to transfer txids when address transaction list is empty", async () => {
      api.safeRpcList.mockResolvedValueOnce({ result: [], totalCount: 0 });
      accountService.getNep17Transfers.mockResolvedValueOnce({
        result: [
          { txid: "0x111", timestamp: 100 },
          { txid: "0x222", timestamp: 200 },
        ],
        totalCount: 2,
      });
      accountService.getNep11Transfers.mockResolvedValueOnce({
        result: [
          { txid: "0x222", timestamp: 200 },
          { txid: "0x333", timestamp: 150 },
        ],
        totalCount: 2,
      });

      api.safeRpc.mockImplementation(async (method, params) => {
        if (method === "GetRawTransactionByTransactionHash") {
          return {
            hash: params.TransactionHash,
            vmstate: "HALT",
            blocktime: 1700000000,
          };
        }
        return null;
      });

      const result = await transactionService.getByAddress("NdzY4...", 2, 0);

      expect(accountService.getNep17Transfers).toHaveBeenCalledTimes(1);
      expect(accountService.getNep11Transfers).toHaveBeenCalledTimes(1);
      expect(result.totalCount).toBe(3);
      expect(result.result).toHaveLength(2);
      expect(result.result.map((tx) => tx.hash)).toEqual(["0x222", "0x333"]);
    });
  });
});
