import { describe, it, expect, vi, beforeEach } from "vitest";
import { tokenService } from "../../src/services/tokenService.js";
import * as api from "../../src/services/api.js";

vi.mock("../../src/services/api.js", () => ({
  rpc: vi.fn(),
  safeRpc: vi.fn(),
  safeRpcList: vi.fn(),
  formatListResponse: vi.fn((r) => r),
}));

vi.mock("../../src/services/indexerReadService.js", () => ({
  indexerReadService: {
    getTokens: vi.fn(),
    getToken: vi.fn(),
    getContractNotifications: vi.fn(),
  },
}));

import { indexerReadService } from "../../src/services/indexerReadService.js";
import { clearAllCache } from "../../src/services/cache.js";

describe("tokenService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAllCache();
    indexerReadService.getTokens.mockRejectedValue(new Error("indexer offline"));
    indexerReadService.getToken.mockRejectedValue(new Error("indexer offline"));
    indexerReadService.getContractNotifications.mockRejectedValue(new Error("indexer offline"));
  });

  describe("getNep17List", () => {
    it("calls rpc with NEP17 type", async () => {
      const mockData = { result: [], totalCount: 0 };
      api.safeRpcList.mockResolvedValueOnce(mockData);

      await tokenService.getNep17List(10, 5);
      expect(api.safeRpcList).toHaveBeenCalledWith(
        "GetAssetInfos",
        { Limit: 10, Skip: 5, Standard: "NEP17" },
        "get token list",
        expect.any(Object)
      );
    });

    it("returns empty on error", async () => {
      api.safeRpcList.mockResolvedValueOnce({ result: [], totalCount: 0 });
      const result = await tokenService.getNep17List();
      expect(result).toEqual({ result: [], totalCount: 0 });
    });
  });

  describe("getNep11List", () => {
    it("calls rpc with NEP11 type", async () => {
      const mockData = { result: [], totalCount: 0 };
      api.safeRpcList.mockResolvedValueOnce(mockData);

      await tokenService.getNep11List(10, 5);
      expect(api.safeRpcList).toHaveBeenCalledWith(
        "GetAssetInfos",
        { Limit: 10, Skip: 5, Standard: "NEP11" },
        "get token list",
        expect.any(Object)
      );
    });
  });

  describe("getByHash", () => {
    it("calls safeRpc with hash", async () => {
      api.safeRpc.mockResolvedValueOnce({ name: "NEO" });
      await tokenService.getByHash("0xhash");
      expect(api.safeRpc).toHaveBeenCalledWith("GetAssetInfoByContractHash", { ContractHash: "0xhash" }, null, expect.any(Object));
    });
  });

  describe("getHolders", () => {
    it("calls rpc with hash and pagination", async () => {
      const mockData = { result: [], totalCount: 0 };
      api.safeRpcList.mockResolvedValueOnce(mockData);

      await tokenService.getHolders("0xhash", 10, 5);
      expect(api.safeRpcList).toHaveBeenCalledWith(
        "GetAssetHoldersByContractHash",
        { ContractHash: "0xhash", Limit: 10, Skip: 5 },
        "get token holders",
        expect.any(Object)
      );
    });
  });

  // Indexer-first migration tests (#173).
  describe("getTokenListWithFallback indexer-first", () => {
    it("returns indexer rows mapped to legacy shape; skips legacy RPC", async () => {
      indexerReadService.getTokens.mockResolvedValue({
        data: [
          {
            contract_hash: "0xtoken",
            display_name: "TestToken",
            symbol: "TST",
            holder_count: 42,
            total_supply_raw: "1000000",
            decimals: 8,
            standard: "NEP17",
          },
        ],
        paging: { total: 1 },
      });

      const result = await tokenService.getTokenListWithFallback("NEP17", 20, 0);

      expect(api.safeRpcList).not.toHaveBeenCalled();
      expect(result).toEqual({
        result: [
          {
            hash: "0xtoken",
            tokenname: "TestToken",
            symbol: "TST",
            holders: 42,
            totalsupply: "1000000",
            decimals: 8,
            type: "NEP17",
            standard: "NEP17",
          },
        ],
        totalCount: 1,
      });
    });

    it("falls back to legacy when indexer returns empty", async () => {
      indexerReadService.getTokens.mockResolvedValue({ data: [], paging: { total: 0 } });
      api.safeRpcList.mockResolvedValueOnce({
        result: [{ hash: "0xleg", tokenname: "LegacyTok" }],
        totalCount: 1,
      });

      const result = await tokenService.getTokenListWithFallback("NEP17", 20, 0);

      expect(result.result[0].hash).toBe("0xleg");
      expect(api.safeRpcList).toHaveBeenCalled();
    });
  });

  describe("getNep11Properties indexer-first", () => {
    it("decodes Map result from invokefunction(properties)", async () => {
      // base64 "name", "Test NFT", "image", "ipfs://..."
      const tokenId = "dG9rZW4tMQ==";
      api.safeRpc.mockResolvedValueOnce({
        state: "HALT",
        stack: [
          {
            type: "Map",
            value: [
              { key: { value: btoa("name") }, value: { value: btoa("Test NFT") } },
              { key: { value: btoa("image") }, value: { value: btoa("ipfs://abc") } },
            ],
          },
        ],
      });

      const result = await tokenService.getNep11Properties("0xnft", [tokenId]);

      expect(api.safeRpc).toHaveBeenCalledWith(
        "invokefunction",
        ["0xnft", "properties", [{ type: "ByteString", value: tokenId }]],
        null,
        expect.any(Object),
      );
      expect(result.result[0]).toMatchObject({
        tokenId,
        name: "Test NFT",
        image: "ipfs://abc",
      });
    });

    it("falls back to legacy GetNep11Properties RPC when invokefunction faults", async () => {
      const tokenId = "dG9rZW4tMQ==";
      api.safeRpc
        .mockResolvedValueOnce({ state: "FAULT", stack: [] })
        .mockResolvedValueOnce({ result: [{ tokenId, name: "Legacy" }] });

      const result = await tokenService.getNep11Properties("0xnft", [tokenId]);

      expect(api.safeRpc).toHaveBeenCalledWith(
        "GetNep11PropertiesByContractHashTokenId",
        { ContractHash: "0xnft", TokenIds: [tokenId] },
        null,
        expect.any(Object),
      );
      expect(result.result[0].name).toBe("Legacy");
    });
  });
});
