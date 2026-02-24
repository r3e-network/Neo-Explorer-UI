import { beforeEach, describe, expect, it, vi } from "vitest";
import { addressToScriptHash } from "../../src/utils/neoHelpers";

const safeRpc = vi.fn();
const resolveDomain = vi.fn();

vi.mock("../../src/services/api.js", () => ({
  safeRpc,
}));

vi.mock("../../src/services/nnsService.js", () => ({
  default: {
    resolveDomain,
  },
}));

vi.mock("../../src/services/cache.js", () => ({
  cachedRequest: (_key, fetchFn) => fetchFn(),
  getCacheKey: vi.fn(() => "search-cache-key"),
  CACHE_TTL: { block: 15000 },
}));

describe("searchService address lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finds account by converting Neo address to script hash first", async () => {
    const query = "NZ6bKQGT6mWqbXRNjX9ohAr5fVZwifWtGW";
    const scriptHash = addressToScriptHash(query);

    safeRpc.mockImplementation(async (_method, params) => {
      if (params?.Address === scriptHash) {
        return { address: scriptHash, firstusetime: 1627978102039 };
      }
      return null;
    });

    const { searchService } = await import("../../src/services/searchService.js");
    const result = await searchService.search(query);

    expect(safeRpc).toHaveBeenCalledWith("GetAddressByAddress", { Address: scriptHash }, null);
    expect(result).toEqual({
      type: "address",
      data: { address: scriptHash, firstusetime: 1627978102039 },
    });
  });

  it("resolves .neo domains using script-hash address lookup", async () => {
    const nns = "neo3.neo";
    const resolvedAddress = "NZ6bKQGT6mWqbXRNjX9ohAr5fVZwifWtGW";
    const scriptHash = addressToScriptHash(resolvedAddress);

    resolveDomain.mockResolvedValueOnce(resolvedAddress);
    safeRpc.mockImplementation(async (_method, params) => {
      if (params?.Address === scriptHash) {
        return { address: scriptHash };
      }
      return null;
    });

    const { searchService } = await import("../../src/services/searchService.js");
    const result = await searchService.search(nns);

    expect(resolveDomain).toHaveBeenCalledWith(nns);
    expect(safeRpc).toHaveBeenCalledWith("GetAddressByAddress", { Address: scriptHash }, null);
    expect(result).toEqual({
      type: "address",
      data: { address: scriptHash, resolvedNns: nns },
    });
  });

  it("finds contract by 40-char hash queries", async () => {
    const query = "0xd2a4cff31913016155e38e474a2c06d08be276cf";
    safeRpc.mockImplementation(async (method, params) => {
      if (method === "GetContractByContractHash" && params?.ContractHash === query) {
        return { hash: query, name: "GasToken" };
      }
      return null;
    });

    const { searchService } = await import("../../src/services/searchService.js");
    const result = await searchService.search(query);

    expect(safeRpc).toHaveBeenCalledWith("GetContractByContractHash", { ContractHash: query }, null);
    expect(result).toEqual({
      type: "contract",
      data: { hash: query, name: "GasToken" },
    });
  });
});
