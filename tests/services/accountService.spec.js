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
        "get account list",
        expect.any(Object)
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
      await accountService.getByAddress("0xNAddr");
      expect(api.safeRpc).toHaveBeenCalledWith("GetAddressByAddress", { Address: "0xNAddr" }, null, expect.any(Object));
    });

    it("falls back to native balance/transfer RPCs when indexed address is not found", async () => {
      api.safeRpc
        .mockResolvedValueOnce(null) // GetAddressByAddress
        .mockResolvedValueOnce({
          balance: [
            { assethash: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5", amount: "12" },
            { assethash: "0xd2a4cff31913016155e38e474a2c06d08be276cf", amount: "34" },
          ],
        }) // getnep17balances
        .mockResolvedValueOnce({ balance: [] }) // getnep11balances
        .mockResolvedValueOnce({
          sent: [{ txhash: "0x01" }],
          received: [{ txhash: "0x02" }],
        }) // getnep17transfers
        .mockResolvedValueOnce({ sent: [], received: [] }); // getnep11transfers

      const result = await accountService.getByAddress("NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp");

      expect(result).toEqual(
        expect.objectContaining({
          neoBalance: "12",
          gasBalance: "34",
          txCount: 2,
          tokenCount: 2,
        })
      );
      expect(api.safeRpc).toHaveBeenCalledWith(
        "getnep17balances",
        ["NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp"],
        null,
        expect.any(Object)
      );
    });
  });

  describe("getAssets", () => {
    it("calls safeRpc with address", async () => {
      api.safeRpc.mockResolvedValueOnce([{ asset: "NEO" }]);
      await accountService.getAssets("0xNAddr");
      expect(api.safeRpc).toHaveBeenCalledWith("GetAssetsHeldByAddress", { Address: "0xNAddr" }, [], expect.any(Object));
    });

    it("falls back to native balance RPCs when indexed assets are empty", async () => {
      api.safeRpc
        .mockResolvedValueOnce([]) // GetAssetsHeldByAddress
        .mockResolvedValueOnce({
          balance: [{ assethash: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5", symbol: "NEO", amount: "5", decimals: "0" }],
        }) // getnep17balances
        .mockResolvedValueOnce({ balance: [] }); // getnep11balances

      const result = await accountService.getAssets("NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp");
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            asset: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
            symbol: "NEO",
            balance: "5",
            standard: "NEP17",
          }),
        ])
      );
    });
  });

  describe("getNep17Transfers", () => {
    it("falls back to native transfer RPC when indexed transfer list is empty", async () => {
      api.safeRpcList.mockResolvedValueOnce({ result: [], totalCount: 0 }); // GetNep17TransferByAddress
      api.safeRpc
        .mockResolvedValueOnce({
          sent: [
            {
              txhash: "0x10",
              transferaddress: "NaSender",
              timestamp: 200,
              amount: "1",
              assethash: "0xabc",
            },
          ],
          received: [],
        }) // getnep17transfers
        .mockResolvedValueOnce({
          balance: [{ assethash: "0xabc", symbol: "ABC", name: "ABC Token", decimals: "8" }],
        }); // getnep17balances

      const result = await accountService.getNep17Transfers("NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp", 10, 0);
      expect(result.totalCount).toBe(1);
      expect(result.result[0]).toEqual(
        expect.objectContaining({
          txid: "0x10",
          contract: "0xabc",
          symbol: "ABC",
        })
      );
    });
  });
});
