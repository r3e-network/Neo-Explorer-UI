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
    vi.clearAllMocks();
  });

  describe("getCount", () => {
    it("calls safeRpc correctly", async () => {
      api.safeRpc.mockResolvedValueOnce(50000);
      const result = await transactionService.getCount();
      expect(api.safeRpc).toHaveBeenCalledWith("GetTransactionCount", {}, 0);
      expect(result).toBe(50000);
    });
  });

  describe("getList", () => {
    it("calls rpc with pagination", async () => {
      const mockData = { result: [{ hash: "0x1" }], totalCount: 100 };
      api.safeRpcList.mockResolvedValueOnce(mockData);
      
      await transactionService.getList(10, 5);
      expect(api.safeRpcList).toHaveBeenCalled();
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
    it("calls rpc with address and pagination", async () => {
      const mockData = { result: [], totalCount: 0 };
      api.safeRpcList.mockResolvedValueOnce(mockData);
      
      await transactionService.getByAddress("NAddr", 15, 10);
      expect(api.safeRpcList).toHaveBeenCalledWith(
        "GetRawTransactionByAddress",
        { Address: "NAddr", Limit: 15, Skip: 10 },
        "get transactions by address"
      );
    });
  });
});
