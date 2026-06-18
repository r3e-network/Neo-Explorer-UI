import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
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
  neonMock.tx = {};
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
    // Default: indexer offline.
    api.safeRpc.mockResolvedValue(null);
    indexerReadService.getTransactions.mockRejectedValue(new Error("indexer offline"));
    indexerReadService.getSummary.mockRejectedValue(new Error("indexer offline"));
  });

  describe("getCount", () => {
    it("returns 0 without legacy RPC when summary is unavailable", async () => {
      const result = await transactionService.getCount();
      expect(api.safeRpc).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

  });

  describe("getList", () => {
    it("returns empty without legacy RPC when indexer is unavailable", async () => {
      const result = await transactionService.getList(10, 5, { enrichMissingFields: true });
      expect(api.safeRpcList).not.toHaveBeenCalled();
      expect(result).toEqual({ result: [], totalCount: 0 });
    });

    it("returns empty on error", async () => {
      const result = await transactionService.getList();
      expect(result).toEqual({ result: [], totalCount: 0 });
    });

    it("does not default missing enriched vmstate to HALT", async () => {
      indexerReadService.getTransactions.mockResolvedValueOnce({
        data: [{ txid: "0xNoState", block_index: 1, block_time_ms: 1700000000 }],
        paging: { total: 1 },
      });
      indexerReadService.getSummary.mockResolvedValueOnce({ total_tx_count: 1 });

      const result = await transactionService.getList(10, 0, { enrichMissingFields: true });

      expect(result.result[0].vmstate).not.toBe("HALT");
    });

  });

  describe("getByHash", () => {
    it("does not call legacy safeRpc when native detail is unavailable", async () => {
      const hash = "0xabc123";
      const result = await transactionService.getByHash(hash);
      expect(api.safeRpc).not.toHaveBeenCalledWith("GetRawTransactionByTransactionHash", expect.anything(), expect.anything(), expect.anything());
      expect(result).toBeNull();
    });

    it("uses standard JSON-RPC transaction and block header methods without neon RPCClient", async () => {
      const hash = "0xabc123";
      api.safeRpc.mockImplementation(async (method, params) => {
        if (method === "getrawtransaction" && params[0] === hash) {
          return {
            hash,
            blockhash: "0xblock",
            netfee: "1",
            sysfee: "2",
            vmstate: "HALT",
          };
        }
        if (method === "getblockheader" && params[0] === "0xblock") {
          return { hash: "0xblock", index: 12345 };
        }
        return null;
      });

      const result = await transactionService.getByHash(hash);

      expect(api.safeRpc).toHaveBeenCalledWith("getrawtransaction", [hash, 1], null, { throwOnError: true });
      expect(api.safeRpc).toHaveBeenCalledWith("getblockheader", ["0xblock", 1], null, { throwOnError: true });
      expect(result).toMatchObject({
        hash,
        txid: hash,
        blockindex: 12345,
        vmstate: "HALT",
      });
    });

    it("keeps transaction detail lookup off the neon-js RPC client path", () => {
      const source = fs.readFileSync(path.resolve(process.cwd(), "src/services/transactionService.js"), "utf8");

      expect(source).not.toContain("@/utils/neonLoader");
      expect(source).not.toContain("RpcClient");
      expect(source).not.toContain("callWithRpcEndpointFallback");
      expect(source).toContain('safeRpc("getrawtransaction"');
      expect(source).toContain('safeRpc("getblockheader"');
    });
  });

  describe("getByAddress", () => {
    it("uses indexer account transactions without legacy RPC", async () => {
      indexerReadService.getAccountTransactions = vi.fn().mockResolvedValueOnce({
        data: [{ txid: "0xAnother", block_index: 1, block_time_ms: 10, vm_state: "HALT" }],
        paging: { total: 1 },
      });
      const result = await transactionService.getByAddress("0xNAddr", 15, 10, { enrichMissingFields: true });
      expect(api.safeRpcList).not.toHaveBeenCalled();
      expect(result.result[0].vmstate).toBe("HALT");
    });

    it("falls back to transfer txids when address transaction list is empty", async () => {
      indexerReadService.getAccountTransactions = vi.fn().mockResolvedValueOnce(null);
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

    it("getCount returns 0 when indexer summary is empty", async () => {
      indexerReadService.getSummary.mockResolvedValue({ total_tx_count: 0 });

      const result = await transactionService.getCount();

      expect(api.safeRpc).not.toHaveBeenCalled();
      expect(result).toBe(0);
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

    it("getList returns empty when indexer rows empty", async () => {
      indexerReadService.getTransactions.mockResolvedValue({ data: [], paging: { total: 0 } });
      indexerReadService.getSummary.mockResolvedValue(null);

      const result = await transactionService.getList();

      expect(api.safeRpcList).not.toHaveBeenCalled();
      expect(result).toEqual({ result: [], totalCount: 0 });
    });
  });
});
