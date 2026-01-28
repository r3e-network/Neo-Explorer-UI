import { describe, it, expect, vi, beforeEach } from "vitest";
import { blockService } from "../../src/services/blockService.js";
import * as api from "../../src/services/api.js";

// Mock api module
vi.mock("../../src/services/api.js", () => ({
  rpc: vi.fn(),
  safeRpc: vi.fn(),
  formatListResponse: vi.fn((r) => r),
}));

describe("blockService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCount", () => {
    it("calls safeRpc with correct params", async () => {
      api.safeRpc.mockResolvedValueOnce(12345);
      const result = await blockService.getCount();
      expect(api.safeRpc).toHaveBeenCalledWith("GetBlockCount", {}, 0);
      expect(result).toBe(12345);
    });
  });

  describe("getBestHash", () => {
    it("calls safeRpc with correct params", async () => {
      const hash = "0xabc123";
      api.safeRpc.mockResolvedValueOnce(hash);
      const result = await blockService.getBestHash();
      expect(api.safeRpc).toHaveBeenCalledWith("GetBestBlockHash", {}, null);
      expect(result).toBe(hash);
    });
  });

  describe("getList", () => {
    it("calls rpc with pagination params", async () => {
      const mockData = { result: [{ height: 1 }], totalCount: 100 };
      api.rpc.mockResolvedValueOnce(mockData);
      api.formatListResponse.mockReturnValueOnce(mockData);
      
      const result = await blockService.getList(10, 5);
      expect(api.rpc).toHaveBeenCalledWith("GetBlockInfoList", { Limit: 10, Skip: 5 });
      expect(result).toEqual(mockData);
    });

    it("returns empty on error", async () => {
      api.rpc.mockRejectedValueOnce(new Error("fail"));
      const result = await blockService.getList();
      expect(result).toEqual({ result: [], totalCount: 0 });
    });
  });

  describe("getByHash", () => {
    it("calls safeRpc with hash", async () => {
      const hash = "0xabc";
      api.safeRpc.mockResolvedValueOnce({ height: 100 });
      await blockService.getByHash(hash);
      expect(api.safeRpc).toHaveBeenCalledWith("GetBlockByBlockHash", { BlockHash: hash }, null);
    });
  });

  describe("getByHeight", () => {
    it("calls safeRpc with height", async () => {
      api.safeRpc.mockResolvedValueOnce({ hash: "0x123" });
      await blockService.getByHeight(100);
      expect(api.safeRpc).toHaveBeenCalledWith("GetBlockByBlockHeight", { BlockHeight: 100 }, null);
    });
  });
});
