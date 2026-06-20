import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getByHash", () => {
    it("returns token detail from the indexer without legacy RPC", async () => {
      indexerReadService.getToken.mockResolvedValueOnce({
        contract_hash: "0xhash",
        display_name: "NEO",
        symbol: "NEO",
        holder_count: 10,
        total_supply_raw: "100",
        decimals: 0,
        standard: "NEP17",
      });
      const result = await tokenService.getByHash("0xhash");
      expect(api.safeRpc).not.toHaveBeenCalledWith("GetAssetInfoByContractHash", expect.anything(), expect.anything(), expect.anything());
      expect(result).toMatchObject({ hash: "0xhash", tokenname: "NEO", symbol: "NEO" });
    });

    it("falls back to chain contract state for indexed tokens without stats", async () => {
      indexerReadService.getToken.mockResolvedValueOnce(null);
      api.safeRpc.mockImplementation(async (method, params) => {
        if (method === "getcontractstate") {
          return {
            hash: params[0],
            manifest: {
              name: "FreshToken",
              supportedstandards: ["NEP-17"],
            },
          };
        }
        if (method === "invokefunction" && params[1] === "decimals") {
          return { state: "HALT", stack: [{ value: "8" }] };
        }
        if (method === "invokefunction" && params[1] === "symbol") {
          return { state: "HALT", stack: [{ value: btoa("FRESH") }] };
        }
        return null;
      });

      const result = await tokenService.getByHash("0xhash");

      expect(api.safeRpc).toHaveBeenCalledWith("getcontractstate", ["0xhash"], null, expect.any(Object));
      expect(result).toMatchObject({
        hash: "0xhash",
        tokenname: "FreshToken",
        symbol: "FRESH",
        decimals: 8,
        totalsupply: "0",
        standard: "NEP17",
      });
    });

    it("does not treat plain contracts as tokens when detail is missing", async () => {
      indexerReadService.getToken.mockResolvedValueOnce(null);
      api.safeRpc.mockResolvedValueOnce({
        hash: "0xplain",
        manifest: {
          name: "PlainContract",
          supportedstandards: [],
        },
      });

      const result = await tokenService.getByHash("0xplain");

      expect(result).toBeNull();
    });
  });

  describe("getHolders", () => {
    it("reads holders from the REST balance view", async () => {
      indexerReadService.getToken.mockResolvedValueOnce({ total_supply_raw: "100", holder_count: 1 });
      vi.stubGlobal("fetch", vi.fn(async () => ({
        ok: true,
        json: async () => [{ address: "Nholder", balance_raw: "5" }],
      })));

      const result = await tokenService.getHolders("0xhash", 10, 5);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/rest/"),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(api.safeRpcList).not.toHaveBeenCalled();
      expect(result).toEqual({
        result: [{ address: "Nholder", balance: "5", percentage: 0.05 }],
        totalCount: 1,
      });
    });
  });

  describe("network isolation", () => {
    it("uses the explicit network for batched transaction transfer lookups", async () => {
      const txid = `0x${"a".repeat(64)}`;
      vi.stubGlobal("fetch", vi.fn(async () => ({
        ok: true,
        json: async () => [
          {
            txid,
            from_address: "Nfrom",
            to_address: "Nto",
            amount_raw: "1",
            contract_hash: "0xhash",
          },
        ],
      })));

      const result = await tokenService.getTransfersByTxHashesBatch([txid], "nep17", { network: "testnet" });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/rest/testnet/nep17_transfers?"),
        expect.objectContaining({ headers: { Accept: "application/json" } }),
      );
      expect(fetch.mock.calls[0][0]).toContain("network=eq.testnet");
      expect(result.get(txid)).toEqual([
        expect.objectContaining({ txid, contract: "0xhash" }),
      ]);
    });

    it("forwards explicit network to token metadata and RPC fallback", async () => {
      indexerReadService.getToken.mockResolvedValueOnce(null);
      api.safeRpc.mockResolvedValueOnce({
        hash: "0xhash",
        manifest: { name: "TestnetToken", supportedstandards: ["NEP-17"] },
      });

      await tokenService.getByHashWithFallback("0xhash", { network: "testnet" });

      expect(indexerReadService.getToken).toHaveBeenCalledWith("0xhash", { network: "testnet" });
      expect(api.safeRpc).toHaveBeenCalledWith(
        "getcontractstate",
        ["0xhash"],
        null,
        expect.objectContaining({ network: "testnet" }),
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

    it("returns empty when indexer returns empty", async () => {
      indexerReadService.getTokens.mockResolvedValue({ data: [], paging: { total: 0 } });

      const result = await tokenService.getTokenListWithFallback("NEP17", 20, 0);

      expect(result).toEqual({ result: [], totalCount: 0 });
      expect(api.safeRpcList).not.toHaveBeenCalled();
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

    it("encodes decoded route token ids as RPC ByteString base64", async () => {
      const tokenId = "10101.neo";
      api.safeRpc.mockResolvedValueOnce({
        state: "HALT",
        stack: [
          {
            type: "Map",
            value: [
              { key: { value: btoa("name") }, value: { value: btoa("Matrix Domain") } },
            ],
          },
        ],
      });

      const result = await tokenService.getNep11Properties("0xnft", [tokenId]);

      expect(api.safeRpc).toHaveBeenCalledWith(
        "invokefunction",
        ["0xnft", "properties", [{ type: "ByteString", value: btoa(tokenId) }]],
        null,
        expect.any(Object),
      );
      expect(result.result[0]).toMatchObject({
        tokenId,
        name: "Matrix Domain",
      });
    });

    it("encodes hex route token ids as RPC ByteString base64", async () => {
      const tokenId = "31303130312e6e656f";
      api.safeRpc.mockResolvedValueOnce({
        state: "HALT",
        stack: [
          {
            type: "Map",
            value: [
              { key: { value: btoa("name") }, value: { value: btoa("Matrix Domain") } },
            ],
          },
        ],
      });

      await tokenService.getNep11Properties("0xnft", [tokenId]);

      expect(api.safeRpc).toHaveBeenCalledWith(
        "invokefunction",
        ["0xnft", "properties", [{ type: "ByteString", value: btoa("10101.neo") }]],
        null,
        expect.any(Object),
      );
    });

    it("returns null when invokefunction faults", async () => {
      const tokenId = "dG9rZW4tMQ==";
      api.safeRpc.mockResolvedValueOnce({ state: "FAULT", stack: [] });

      const result = await tokenService.getNep11Properties("0xnft", [tokenId]);

      expect(api.safeRpc).not.toHaveBeenCalledWith("GetNep11PropertiesByContractHashTokenId", expect.anything(), expect.anything(), expect.anything());
      expect(result).toBeNull();
    });
  });
});
