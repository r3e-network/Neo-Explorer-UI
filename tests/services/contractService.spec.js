import { beforeEach, describe, expect, it, vi } from "vitest";

const safeRpcMock = vi.hoisted(() => vi.fn());
const safeRpcListMock = vi.hoisted(() => vi.fn());
const getContractsMock = vi.hoisted(() => vi.fn());
const getContractNotificationsMock = vi.hoisted(() => vi.fn());
const getContractOverviewMock = vi.hoisted(() => vi.fn());

vi.mock("../../src/services/api.js", () => ({
  safeRpc: safeRpcMock,
  safeRpcList: safeRpcListMock,
}));

vi.mock("../../src/services/indexerReadService.js", () => ({
  indexerReadService: {
    getContracts: getContractsMock,
    getContractNotifications: getContractNotificationsMock,
    getContractOverview: getContractOverviewMock,
  },
}));

describe("contractService manifest fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getContractsMock.mockRejectedValue(new Error("indexer offline"));
    getContractNotificationsMock.mockRejectedValue(new Error("indexer offline"));
    getContractOverviewMock.mockResolvedValue(null);
  });

  it("returns native getcontractstate result for getManifest (#181)", async () => {
    const hash = "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd";
    safeRpcMock.mockImplementation(async (method) => {
      if (method === "getcontractstate") {
        return {
          hash,
          manifest: {
            name: "NameService",
            abi: {
              methods: [{ name: "register", safe: false }],
              events: [{ name: "Transfer" }],
            },
          },
        };
      }
      return null;
    });

    const { contractService } = await import("../../src/services/contractService.js");
    const manifest = await contractService.getManifest(hash);

    // Standard `getcontractstate` is the primary source. The legacy
    // GetContractByContractHash Mongo probe should NOT fire when the
    // standard call succeeds (#181).
    expect(safeRpcMock).toHaveBeenCalledWith(
      "getcontractstate",
      [hash],
      null,
      expect.any(Object)
    );
    expect(safeRpcMock).not.toHaveBeenCalledWith(
      "GetContractByContractHash",
      expect.any(Object),
      expect.any(Object),
      expect.any(Object)
    );
    expect(manifest).toEqual({
      name: "NameService",
      abi: {
        methods: [{ name: "register", safe: false }],
        events: [{ name: "Transfer" }],
      },
    });
  });

  it("returns chain-state contract when getcontractstate succeeds (#181)", async () => {
    const hash = "0x03013f49c42a14546c8bbe58f9d434c3517fccab";
    safeRpcMock.mockImplementation(async (method) => {
      if (method === "getcontractstate") {
        return {
          hash,
          updatecounter: 0,
          manifest: {
            name: "NameService",
            abi: {
              methods: [{ name: "register", safe: false }],
              events: [{ name: "Transfer" }, { name: "SetAdmin" }],
            },
          },
        };
      }
      return null;
    });

    const { contractService } = await import("../../src/services/contractService.js");
    const contract = await contractService.getByHashWithFallback(hash);

    // chainState is canonical — the legacy Mongo probe must NOT fire.
    expect(safeRpcMock).not.toHaveBeenCalledWith(
      "GetContractByContractHash",
      expect.any(Object),
      expect.any(Object),
      expect.any(Object)
    );
    expect(contract).toMatchObject({
      hash,
      name: "NameService",
      updatecounter: 0,
      manifest: {
        abi: {
          methods: [{ name: "register", safe: false }],
          events: [{ name: "Transfer" }, { name: "SetAdmin" }],
        },
      },
    });
  });
});

// Three-tier fallback chain (#168 + #169) for getScCalls.
describe("contractService.getScCalls fallback chain", () => {
  const HASH = "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5"; // NEO native

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Default: indexer notifications offline so Source 2 is unreachable.
    getContractNotificationsMock.mockRejectedValue(new Error("indexer offline"));
  });

  it("Source 1: returns rows from /rest/v1/contract_calls when present", async () => {
    const restRows = [
      { txid: "0xt1", block_index: 100, first_event_name: "Transfer", origin_sender: "Nfoo" },
      { txid: "0xt2", block_index: 99, first_event_name: "Mint", origin_sender: "Nbar" },
    ];
    getContractOverviewMock.mockResolvedValueOnce({ tx_count: 1234 });
    const fetchMock = vi.fn(async (url) => {
      if (url.includes("/contract_calls")) {
        return { ok: true, json: async () => restRows };
      }
      return { ok: false, json: async () => null };
    });
    vi.stubGlobal("fetch", fetchMock);

    const { contractService } = await import("../../src/services/contractService.js");
    const result = await contractService.getScCalls(HASH, 20, 0);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/contract_calls"),
      expect.any(Object),
    );
    expect(result).toEqual({
      result: [
        { txid: "0xt1", blockindex: 100, method: "Transfer", callFlags: "", originSender: "Nfoo" },
        { txid: "0xt2", blockindex: 99, method: "Mint", callFlags: "", originSender: "Nbar" },
      ],
      totalCount: 1234,
    });
    // Legacy RPC must not be touched.
    expect(safeRpcListMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("Source 2: falls back to client-side derivation when REST endpoint 404s", async () => {
    getContractOverviewMock.mockResolvedValue({ tx_count: 99 });
    const fetchMock = vi.fn(async (url) => {
      if (url.includes("/contract_calls")) return { ok: false, status: 404, json: async () => null };
      if (url.includes("/transaction_signers")) {
        return { ok: true, json: async () => [{ txid: "0xt1", account: "Nsender", position: 0 }] };
      }
      return { ok: false };
    });
    vi.stubGlobal("fetch", fetchMock);

    getContractNotificationsMock.mockResolvedValueOnce({
      data: [
        { txid: "0xt1", block_index: 50, event_name: "Transfer" },
        { txid: "0xt1", block_index: 50, event_name: "Approval" }, // duplicate dedup'd
      ],
      paging: { total: 50 },
    });

    const { contractService } = await import("../../src/services/contractService.js");
    const result = await contractService.getScCalls(HASH, 20, 0);

    expect(getContractNotificationsMock).toHaveBeenCalled();
    expect(result.result).toEqual([
      { txid: "0xt1", blockindex: 50, method: "Transfer", callFlags: "", originSender: "Nsender" },
    ]);
    expect(result.totalCount).toBe(99);
    expect(safeRpcListMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("Source 3: falls back to legacy GetScCallByContractHash when both Postgres paths empty", async () => {
    const fetchMock = vi.fn(async (url) => {
      if (url.includes("/contract_calls")) return { ok: false, status: 404 };
      if (url.includes("/contracts/")) return { ok: false };
      return { ok: false };
    });
    vi.stubGlobal("fetch", fetchMock);

    getContractNotificationsMock.mockResolvedValueOnce({ data: [], paging: { total: 0 } });
    safeRpcListMock.mockResolvedValueOnce({
      result: [{ txid: "0xtleg", method: "Legacy" }],
      totalCount: 1,
    });

    const { contractService } = await import("../../src/services/contractService.js");
    const result = await contractService.getScCalls(HASH, 20, 0);

    expect(safeRpcListMock).toHaveBeenCalledWith(
      "GetScCallByContractHash",
      { ContractHash: HASH, Limit: 20, Skip: 0 },
      "get SC calls",
      expect.any(Object),
    );
    expect(result.result[0].txid).toBe("0xtleg");

    vi.unstubAllGlobals();
  });
});

// Indexer-first migration tests (#173) for getListWithFallback.
describe("contractService.getListWithFallback indexer-first", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getContractsMock.mockRejectedValue(new Error("indexer offline"));
  });

  it("returns indexer rows mapped to legacy shape; skips legacy GetContractList", async () => {
    getContractsMock.mockResolvedValueOnce({
      data: [
        {
          contract_hash: "0xc1",
          display_name: "Foo",
          standards: ["NEP-17"],
          tx_count: 100,
          verified: true,
          created_at_ms: 1700000000000,
        },
      ],
      paging: { total: 1 },
    });

    const { contractService } = await import("../../src/services/contractService.js");
    const result = await contractService.getListWithFallback(20, 0);

    expect(safeRpcListMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      result: [
        {
          hash: "0xc1",
          name: "Foo",
          manifest: { supportedstandards: ["NEP-17"] },
          totalsccall: 100,
          verified: true,
          createtime: 1700000000000,
        },
      ],
      totalCount: 1,
    });
  });

  it("falls back to legacy when indexer returns empty", async () => {
    getContractsMock.mockResolvedValueOnce({ data: [], paging: { total: 0 } });
    safeRpcListMock.mockResolvedValueOnce({
      result: [{ hash: "0xleg", name: "LegacyContract" }],
      totalCount: 1,
    });

    const { contractService } = await import("../../src/services/contractService.js");
    const result = await contractService.getListWithFallback(20, 0);

    expect(result.result[0].hash).toBe("0xleg");
    expect(safeRpcListMock).toHaveBeenCalled();
  });
});
