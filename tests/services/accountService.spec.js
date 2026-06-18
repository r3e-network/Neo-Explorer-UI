import { describe, it, expect, vi, beforeEach } from "vitest";
import { accountService } from "../../src/services/accountService.js";
import * as api from "../../src/services/api.js";
import { clearAllCache } from "../../src/services/cache.js";

const summaryMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("../../src/services/api.js", () => ({
  rpc: vi.fn(),
  safeRpc: vi.fn(),
  safeRpcList: vi.fn(),
  formatListResponse: vi.fn((r) => r),
}));

vi.mock("../../src/services/indexerReadService.js", () => ({
  indexerReadService: {
    getSummary: summaryMock,
  },
}));

describe("accountService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.rpc.mockReset();
    api.safeRpc.mockReset();
    api.safeRpcList.mockReset();
    clearAllCache();
    summaryMock.mockResolvedValue({ total_address_count: 0 });
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => null,
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  describe("getList", () => {
    it("returns empty without calling legacy RPC when indexer has no rows", async () => {
      const result = await accountService.getList(10, 5);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/rest/"),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(api.safeRpcList).not.toHaveBeenCalled();
      expect(result).toEqual({ result: [], totalCount: 0 });
    });

    it("returns empty on error", async () => {
      api.safeRpcList.mockResolvedValueOnce({ result: [], totalCount: 0 });
      const result = await accountService.getList();
      expect(result).toEqual({ result: [], totalCount: 0 });
    });
  });

  describe("getByAddress", () => {
    it("derives balances from native RPCs without the legacy first-attempt", async () => {
      api.safeRpc
        .mockResolvedValueOnce({
          balance: [
            { assethash: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5", amount: "12" },
            { assethash: "0xd2a4cff31913016155e38e474a2c06d08be276cf", amount: "34" },
          ],
        }) // getnep17balances
        .mockResolvedValueOnce({ balance: [] }); // getnep11balances

      const result = await accountService.getByAddress("NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp");

      expect(result).toEqual(
        expect.objectContaining({
          neoBalance: "12",
          gasBalance: "34",
          txCount: 0,
          tokenCount: 2,
        })
      );
      expect(api.safeRpc).toHaveBeenCalledWith(
        "getnep17balances",
        ["NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp"],
        null,
        expect.any(Object)
      );
      // The dead-Mongo GetAddressByAddress must not be the first attempt.
      expect(api.safeRpc).not.toHaveBeenCalledWith(
        "GetAddressByAddress",
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });

    it("returns null without calling legacy RPC when the node is unreachable", async () => {
      api.safeRpc
        .mockResolvedValueOnce(null) // getnep17balances (node down)
        .mockResolvedValueOnce(null); // getnep11balances

      const result = await accountService.getByAddress("NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp");
      expect(api.safeRpc).not.toHaveBeenCalledWith(
        "GetAddressByAddress",
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
      expect(result).toBeNull();
    });
  });

  describe("getAssets", () => {
    it("uses native getnep17balances/getnep11balances first (#182)", async () => {
      api.safeRpc.mockImplementation(async (method) => {
        if (method === "getnep17balances") return {
          balance: [{ assethash: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5", symbol: "NEO", amount: "5", decimals: "0" }],
        };
        if (method === "getnep11balances") return { balance: [] };
        return null;
      });

      const result = await accountService.getAssets("NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp");

      expect(api.safeRpc).toHaveBeenCalledWith(
        "getnep17balances",
        ["NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp"],
        null,
        expect.any(Object),
      );
      // Legacy GetAssetsHeldByAddress must not fire on the happy path.
      expect(api.safeRpc).not.toHaveBeenCalledWith(
        "GetAssetsHeldByAddress",
        expect.any(Object),
        expect.any(Array),
        expect.any(Object),
      );
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

    it("returns empty without legacy asset fallback when native balances are empty", async () => {
      api.safeRpc
        .mockResolvedValueOnce({ balance: [] }) // getnep17balances empty
        .mockResolvedValueOnce({ balance: [] }); // getnep11balances empty

      const result = await accountService.getAssets("NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp");

      expect(api.safeRpc).not.toHaveBeenCalledWith(
        "GetAssetsHeldByAddress",
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
      expect(result).toEqual([]);
    });
  });

  describe("getNep17Transfers", () => {
    it("uses native getnep17transfers first when indexer returns nothing (#182)", async () => {
      // fetch (indexer /rest/) returns ok: false in the default mock,
      // so fetchAddressTransfersFromIndexer returns null.
      api.safeRpc.mockImplementation(async (method) => {
        if (method === "getnep17balances") return {
          balance: [{ assethash: "0xabc", symbol: "ABC", name: "ABC Token", decimals: "8" }],
        };
        if (method === "getnep17transfers") return {
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
        };
        return null;
      });

      const result = await accountService.getNep17Transfers("NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp", 10, 0);
      expect(result.totalCount).toBe(1);
      expect(result.result[0]).toEqual(
        expect.objectContaining({
          txid: "0x10",
          contract: "0xabc",
          symbol: "ABC",
        })
      );
      // Legacy GetNep17TransferByAddress must not fire on the happy path.
      expect(api.safeRpcList).not.toHaveBeenCalledWith(
        "GetNep17TransferByAddress",
        expect.any(Object),
        expect.any(String),
        expect.any(Object),
      );
    });
  });
});
