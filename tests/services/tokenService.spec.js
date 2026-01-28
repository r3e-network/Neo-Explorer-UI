import { describe, it, expect, vi, beforeEach } from "vitest";
import { tokenService } from "../../src/services/tokenService.js";
import * as api from "../../src/services/api.js";

vi.mock("../../src/services/api.js", () => ({
  rpc: vi.fn(),
  safeRpc: vi.fn(),
  formatListResponse: vi.fn((r) => r),
}));

describe("tokenService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getNep17List", () => {
    it("calls rpc with NEP17 type", async () => {
      const mockData = { result: [], totalCount: 0 };
      api.rpc.mockResolvedValueOnce(mockData);
      api.formatListResponse.mockReturnValueOnce(mockData);
      
      await tokenService.getNep17List(10, 5);
      expect(api.rpc).toHaveBeenCalledWith("GetAssetInfos", { Limit: 10, Skip: 5, Type: "NEP17" });
    });

    it("returns empty on error", async () => {
      api.rpc.mockRejectedValueOnce(new Error("fail"));
      const result = await tokenService.getNep17List();
      expect(result).toEqual({ result: [], totalCount: 0 });
    });
  });

  describe("getNep11List", () => {
    it("calls rpc with NEP11 type", async () => {
      const mockData = { result: [], totalCount: 0 };
      api.rpc.mockResolvedValueOnce(mockData);
      api.formatListResponse.mockReturnValueOnce(mockData);
      
      await tokenService.getNep11List(10, 5);
      expect(api.rpc).toHaveBeenCalledWith("GetAssetInfos", { Limit: 10, Skip: 5, Type: "NEP11" });
    });
  });

  describe("getByHash", () => {
    it("calls safeRpc with hash", async () => {
      api.safeRpc.mockResolvedValueOnce({ name: "NEO" });
      await tokenService.getByHash("0xhash");
      expect(api.safeRpc).toHaveBeenCalledWith("GetAssetInfoByContractHash", { ContractHash: "0xhash" }, null);
    });
  });

  describe("getHolders", () => {
    it("calls rpc with hash and pagination", async () => {
      const mockData = { result: [], totalCount: 0 };
      api.rpc.mockResolvedValueOnce(mockData);
      api.formatListResponse.mockReturnValueOnce(mockData);
      
      await tokenService.getHolders("0xhash", 10, 5);
      expect(api.rpc).toHaveBeenCalledWith("GetAssetHoldersByContractHash", {
        ContractHash: "0xhash",
        Limit: 10,
        Skip: 5,
      });
    });
  });
});
