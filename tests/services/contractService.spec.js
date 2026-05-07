import { beforeEach, describe, expect, it, vi } from "vitest";

const safeRpcMock = vi.hoisted(() => vi.fn());
const safeRpcListMock = vi.hoisted(() => vi.fn());
const getContractsMock = vi.hoisted(() => vi.fn());
const getContractNotificationsMock = vi.hoisted(() => vi.fn());

vi.mock("../../src/services/api.js", () => ({
  safeRpc: safeRpcMock,
  safeRpcList: safeRpcListMock,
}));

vi.mock("../../src/services/indexerReadService.js", () => ({
  indexerReadService: {
    getContracts: getContractsMock,
    getContractNotifications: getContractNotificationsMock,
  },
}));

describe("contractService manifest fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getContractsMock.mockRejectedValue(new Error("indexer offline"));
    getContractNotificationsMock.mockRejectedValue(new Error("indexer offline"));
  });

  it("falls back to native getcontractstate when indexed contract lookup misses", async () => {
    const hash = "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd";
    safeRpcMock.mockImplementation(async (method) => {
      if (method === "GetContractByContractHash") return null;
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

    expect(safeRpcMock).toHaveBeenCalledWith(
      "GetContractByContractHash",
      { ContractHash: hash },
      null,
      expect.any(Object)
    );
    expect(safeRpcMock).toHaveBeenCalledWith(
      "getcontractstate",
      [hash],
      null,
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

  it("merges native chain state into partial indexed contract rows", async () => {
    const hash = "0x03013f49c42a14546c8bbe58f9d434c3517fccab";
    safeRpcMock.mockImplementation(async (method) => {
      if (method === "GetContractByContractHash") {
        return {
          hash,
          name: "NameService",
          totalsccall: 415,
          sender: "NhMYxG5ATmRjSy6ocnPxrA2DiYba6xhFqu",
        };
      }
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

    expect(contract).toMatchObject({
      hash,
      name: "NameService",
      totalsccall: 415,
      sender: "NhMYxG5ATmRjSy6ocnPxrA2DiYba6xhFqu",
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
