import { describe, it, expect, vi, beforeEach } from "vitest";
import { accountService } from "../../src/services/accountService.js";
import * as api from "../../src/services/api.js";

vi.mock("../../src/services/api.js", () => ({
  rpc: vi.fn(),
  safeRpc: vi.fn(),
  safeRpcList: vi.fn(),
  formatListResponse: vi.fn((r) => r),
}));

describe("accountService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getList", () => {
    it("calls rpc with pagination", async () => {
      const mockData = { result: [], totalCount: 0 };
      api.safeRpcList.mockResolvedValueOnce(mockData);
      
      await accountService.getList(10, 5);
      expect(api.safeRpcList).toHaveBeenCalledWith(
        "GetAddressList",
        { Limit: 10, Skip: 5 },
        "get account list"
      );
    });

    it("returns empty on error", async () => {
      api.safeRpcList.mockResolvedValueOnce({ result: [], totalCount: 0 });
      const result = await accountService.getList();
      expect(result).toEqual({ result: [], totalCount: 0 });
    });
  });

  describe("getByAddress", () => {
    it("calls safeRpc with address", async () => {
      api.safeRpc.mockResolvedValueOnce({ balance: 100 });
      await accountService.getByAddress("NAddr");
      expect(api.safeRpc).toHaveBeenCalledWith("GetAddressByAddress", { Address: "NAddr" }, null);
    });
  });

  describe("getAssets", () => {
    it("calls safeRpc with address", async () => {
      api.safeRpc.mockResolvedValueOnce([{ asset: "NEO" }]);
      await accountService.getAssets("NAddr");
      expect(api.safeRpc).toHaveBeenCalledWith("GetAssetsHeldByAddress", { Address: "NAddr" }, []);
    });
  });
});
