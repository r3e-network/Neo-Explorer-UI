import { describe, it, expect, vi, beforeEach } from "vitest";
import { transactionService } from "../../src/services/transactionService.js";
import * as api from "../../src/services/api.js";
import { accountService } from "../../src/services/accountService.js";
import { clearAllCache } from "../../src/services/cache.js";

class MockRpcClient {
  getRawTransaction = vi.fn().mockRejectedValue(new Error("Mock network error"));
  getBlockHeader = vi.fn().mockRejectedValue(new Error("Mock network error"));
}

vi.mock("@cityofzion/neon-js", () => {
  const neonMock = { RpcClient: MockRpcClient };
  neonMock.rpc = { RPCClient: MockRpcClient };
  neonMock.default = neonMock;
  return neonMock;
});

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

vi.mock("../../src/services/indexerReadService.js", () => ({
  indexerReadService: {
    getTransactions: vi.fn(),
    getSummary: vi.fn(),
  },
}));

import { indexerReadService } from "../../src/services/indexerReadService.js";

describe("transactionService", () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.resetAllMocks();
    clearAllCache();
    // Default: indexer offline, so existing tests exercise legacy fallback.
    indexerReadService.getTransactions.mockRejectedValue(new Error("indexer offline"));
    indexerReadService.getSummary.mockRejectedValue(new Error("indexer offline"));
  });

  describe("getCount", () => {
    it("calls safeRpc correctly", async () => {
      api.safeRpc.mockResolvedValueOnce(50000);
      const result = await transactionService.getCount();
      expect(api.safeRpc).toHaveBeenCalledWith("GetTransactionCount", {}, 0, expect.any(Object));
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

    it("does not default missing enriched vmstate to HALT", async () => {
      api.safeRpcList.mockResolvedValueOnce({ result: [{ hash: "0xNoState" }], totalCount: 1 });
      api.safeRpc.mockResolvedValueOnce({ hash: "0xNoState", blocktime: 1700000000 });

      const result = await transactionService.getList(10, 0, { enrichMissingFields: true });

      expect(result.result[0].vmstate).toBeUndefined();
    });

  });

  describe("getByHash", () => {
    it("calls safeRpc with hash", async () => {
      const hash = "0xabc123";
      api.safeRpc.mockResolvedValueOnce({ hash, sender: "addr1", vmstate: "HALT" });
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

  // Indexer-first migration tests (#171). Validate that when the
  // indexer responds, the legacy GetTransactionList / GetTransactionCount
  // PascalCase RPCs are NOT called.
  describe("indexer-first migration", () => {
    it("getCount uses summary.total_tx_count when indexer responds", async () => {
      indexerReadService.getSummary.mockResolvedValue({ total_tx_count: 1234567 });

      const result = await transactionService.getCount();

      expect(result).toBe(1234567);
      expect(api.safeRpc).not.toHaveBeenCalled();
    });

    it("getCount falls back to legacy GetTransactionCount when indexer summary is empty", async () => {
      indexerReadService.getSummary.mockResolvedValue({ total_tx_count: 0 });
      api.safeRpc.mockResolvedValueOnce(99);

      const result = await transactionService.getCount();

      expect(api.safeRpc).toHaveBeenCalledWith("GetTransactionCount", {}, 0, expect.any(Object));
      expect(result).toBe(99);
    });

    it("getList maps indexer rows to legacy field names and skips legacy RPC", async () => {
      indexerReadService.getTransactions.mockResolvedValue({
        data: [
          {
            txid: "0xtxid1",
            block_index: 100,
            block_time_ms: 1700000000000,
            sender_address: "Nfoo",
            sys_fee: "100",
            net_fee: "10",
            vm_state: "HALT",
            valid_until_block: 200,
            contract_hash: "0xcontract",
          },
        ],
        paging: { total: 5_000_000 },
      });
      indexerReadService.getSummary.mockResolvedValue({ total_tx_count: 5_000_000 });

      const result = await transactionService.getList(20, 0);

      expect(api.safeRpcList).not.toHaveBeenCalled();
      expect(result.totalCount).toBe(5_000_000);
      expect(result.result[0]).toMatchObject({
        hash: "0xtxid1",
        blockindex: 100,
        blocktime: 1700000000000,
        sender: "Nfoo",
        sysfee: "100",
        netfee: "10",
        vmstate: "HALT",
        validUntilBlock: 200,
        contractHash: "0xcontract",
      });
    });

    it("getList falls back to legacy when indexer rows empty", async () => {
      indexerReadService.getTransactions.mockResolvedValue({ data: [], paging: { total: 0 } });
      indexerReadService.getSummary.mockResolvedValue(null);
      api.safeRpcList.mockResolvedValueOnce({ result: [{ hash: "0xleg" }], totalCount: 1 });

      const result = await transactionService.getList();

      expect(api.safeRpcList).toHaveBeenCalledWith(
        "GetTransactionList",
        expect.any(Object),
        expect.any(String),
        expect.any(Object),
      );
      expect(result.result[0].hash).toBe("0xleg");
    });
  });
});
