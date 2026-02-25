import { describe, it, expect, vi, beforeEach } from "vitest";
import { transactionService } from "../../src/services/transactionService.js";
import * as api from "../../src/services/api.js";

vi.mock("../../src/services/api.js", () => ({
  rpc: vi.fn(),
  safeRpc: vi.fn(),
  safeRpcList: vi.fn(),
  formatListResponse: vi.fn((r) => r),
}));

describe("transactionService", () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.resetAllMocks();
  });

  describe("getCount", () => {
    it("calls safeRpc correctly", async () => {
      api.safeRpc.mockResolvedValueOnce(50000);
      const result = await transactionService.getCount();
      expect(api.safeRpc).toHaveBeenCalledWith("GetTransactionCount", {}, 0, {});
      expect(result).toBe(50000);
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
  });

  describe("getByHash", () => {
    it("calls safeRpc with hash", async () => {
      const hash = "0xabc123";
      api.safeRpc.mockResolvedValueOnce({ sender: "addr1" });
      await transactionService.getByHash(hash);
      expect(api.safeRpc).toHaveBeenCalledWith(
        "GetRawTransactionByTransactionHash",
        { TransactionHash: hash },
        null
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
        "get transactions by address"
      );
      
      expect(result.result[0].vmstate).toBe("HALT");
    });
  });
});
