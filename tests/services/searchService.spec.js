import { beforeEach, describe, expect, it, vi } from "vitest";
import { addressToScriptHash } from "../../src/utils/neoHelpers";

const resolveNetworkNameMock = vi.hoisted(() => vi.fn(() => "mainnet"));
const safeRpc = vi.fn();
const resolveDomain = vi.fn();
const getByHashWithFallback = vi.fn();
const searchIndex = vi.fn();

vi.mock("../../src/utils/env.js", () => ({
  resolveNetworkName: resolveNetworkNameMock,
}));

vi.mock("../../src/services/api.js", () => ({
  safeRpc,
}));

vi.mock("../../src/services/contractService.js", () => ({
  contractService: {
    getByHashWithFallback,
  },
}));

vi.mock("../../src/services/nnsService.js", () => ({
  default: {
    resolveDomain,
  },
}));

vi.mock("../../src/services/indexerReadService.js", () => ({
  indexerReadService: {
    search: searchIndex,
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
    resolveNetworkNameMock.mockReturnValue("mainnet");
    getByHashWithFallback.mockReset();
    searchIndex.mockResolvedValue({ source: "disabled", hits: [] });
  });

  it("uses read-api search sidecar before typed fallback", async () => {
    const tokenHash = "0xd2a4cff31913016155e38e474a2c06d08be276cf";
    searchIndex.mockResolvedValueOnce({
      source: "meilisearch",
      hits: [{
        type: "token",
        title: "GasToken",
        subtitle: "GAS",
        hash: tokenHash,
        route: `/nep17-token-info/${tokenHash}`,
        score: 0.99,
      }],
    });

    const { searchService } = await import("../../src/services/searchService.js");
    const result = await searchService.search("gas");

    expect(searchIndex).toHaveBeenCalledWith("gas", { limit: 1, network: "mainnet" });
    expect(safeRpc).not.toHaveBeenCalled();
    expect(getByHashWithFallback).not.toHaveBeenCalled();
    expect(result).toEqual({
      type: "token",
      data: expect.objectContaining({
        hash: tokenHash,
        route: `/nep17-token-info/${tokenHash}`,
        title: "GasToken",
      }),
    });
  });

  it("maps sidecar hits into search suggestions", async () => {
    searchIndex.mockResolvedValueOnce({
      source: "meilisearch",
      hits: [{
        type: "contract",
        title: "Flamingo Finance",
        subtitle: "Verified contract",
        hash: "0xabc",
        route: "/contract-info/0xabc",
      }],
    });

    const { searchService } = await import("../../src/services/searchService.js");
    const result = await searchService.suggest("flm", { type: "contracts", limit: 3 });

    expect(searchIndex).toHaveBeenCalledWith("flm", { type: "contract", limit: 3, network: "mainnet" });
    expect(result).toEqual([{
      type: "contract",
      label: "Flamingo Finance",
      value: "0xabc",
      route: "/contract-info/0xabc",
      subtitle: "Verified contract",
      score: undefined,
    }]);
  });

  it("classifies Neo addresses without legacy address RPC", async () => {
    const query = "NZ6bKQGT6mWqbXRNjX9ohAr5fVZwifWtGW";
    const scriptHash = addressToScriptHash(query);

    safeRpc.mockResolvedValue(null);

    const { searchService } = await import("../../src/services/searchService.js");
    const result = await searchService.search(query);

    expect(safeRpc).not.toHaveBeenCalledWith("GetAddressByAddress", expect.anything(), expect.anything());
    expect(result).toEqual({
      type: "address",
      data: { address: scriptHash },
    });
  });

  it("resolves .neo domains without legacy address RPC", async () => {
    const nns = "neo3.neo";
    const resolvedAddress = "NZ6bKQGT6mWqbXRNjX9ohAr5fVZwifWtGW";
    const scriptHash = addressToScriptHash(resolvedAddress);

    resolveDomain.mockResolvedValueOnce(resolvedAddress);
    safeRpc.mockResolvedValue(null);

    const { searchService } = await import("../../src/services/searchService.js");
    const result = await searchService.search(nns);

    expect(resolveDomain).toHaveBeenCalledWith(nns, { network: "mainnet" });
    expect(safeRpc).not.toHaveBeenCalledWith("GetAddressByAddress", expect.anything(), expect.anything());
    expect(result).toEqual({
      type: "address",
      data: { address: scriptHash, resolvedNns: nns },
    });
  });

  it("finds contract by 40-char hash queries via getByHashWithFallback (indexer-first per #173)", async () => {
    const query = "0xd2a4cff31913016155e38e474a2c06d08be276cf";
    safeRpc.mockResolvedValue(null);
    getByHashWithFallback.mockResolvedValueOnce({ hash: query, name: "GasToken" });

    const { searchService } = await import("../../src/services/searchService.js");
    const result = await searchService.search(query);

    expect(getByHashWithFallback).toHaveBeenCalledWith(query, { network: "mainnet" });
    expect(result).toEqual({
      type: "contract",
      data: { hash: query, name: "GasToken" },
    });
  });

  it("returns no contract when getByHashWithFallback yields nothing", async () => {
    const query = "0x03013f49c42a14546c8bbe58f9d434c3517fccab";
    safeRpc.mockResolvedValue(null);
    getByHashWithFallback.mockResolvedValueOnce(null);

    const { searchService } = await import("../../src/services/searchService.js");
    const result = await searchService.search(query);

    expect(result).toEqual({ type: null, data: null });
  });

  it("classifies a base58 address as type=address without legacy RPC", async () => {
    const query = "NZ6bKQGT6mWqbXRNjX9ohAr5fVZwifWtGW";
    const scriptHash = addressToScriptHash(query);
    safeRpc.mockResolvedValue(null);

    const { searchService } = await import("../../src/services/searchService.js");
    const result = await searchService.search(query);

    expect(result.type).toBe("address");
    expect(result.data).toMatchObject({ address: scriptHash });
    expect(safeRpc).not.toHaveBeenCalledWith("GetAddressByAddress", expect.anything(), expect.anything());
  });

  it("uses standard getblock RPC for block-height query", async () => {
    const query = "12345";
    safeRpc.mockImplementation(async (method, params) => {
      if (method === "getblock" && params?.[0] === 12345) {
        return { hash: "0xstdblock", index: 12345, txcount: 3 };
      }
      return null;
    });

    const { searchService } = await import("../../src/services/searchService.js");
    const result = await searchService.search(query);

    expect(safeRpc).toHaveBeenCalledWith("getblock", [12345, 1], null, { network: "mainnet" });
    expect(safeRpc).not.toHaveBeenCalledWith(
      "GetBlockByBlockHeight",
      expect.any(Object),
      expect.any(Object),
    );
    expect(result.type).toBe("block");
    expect(result.data.hash).toBe("0xstdblock");
  });

  it("does not share in-flight exact lookups across network switches", async () => {
    let resolveMainnet;
    let resolveTestnet;
    safeRpc
      .mockReturnValueOnce(new Promise((resolve) => { resolveMainnet = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveTestnet = resolve; }));

    const { searchService } = await import("../../src/services/searchService.js");
    const mainnetSearch = searchService.search("12345");
    resolveNetworkNameMock.mockReturnValue("testnet");
    const testnetSearch = searchService.search("12345");

    resolveTestnet({ hash: "0xtestnet", index: 12345 });
    resolveMainnet({ hash: "0xmainnet", index: 12345 });

    await expect(mainnetSearch).resolves.toEqual({
      type: "block",
      data: { hash: "0xmainnet", index: 12345 },
    });
    await expect(testnetSearch).resolves.toEqual({
      type: "block",
      data: { hash: "0xtestnet", index: 12345 },
    });
    expect(safeRpc).toHaveBeenCalledTimes(2);
  });

  it("prefers exact block-height lookup over stale fuzzy sidecar hits", async () => {
    const query = "10820940";
    searchIndex.mockResolvedValueOnce({
      source: "meilisearch",
      hits: [{
        type: "block",
        title: "Block 10820920",
        route: "/block-info/10820920",
        block_index: 10820920,
      }],
    });
    safeRpc.mockImplementation(async (method, params) => {
      if (method === "getblock" && params?.[0] === 10820940) {
        return { hash: "0xexactblock", index: 10820940, txcount: 1 };
      }
      return null;
    });

    const { searchService } = await import("../../src/services/searchService.js");
    const result = await searchService.search(query);

    expect(result).toEqual({
      type: "block",
      data: { hash: "0xexactblock", index: 10820940, txcount: 1 },
    });
    expect(searchIndex).not.toHaveBeenCalledWith(query, { limit: 1, network: "mainnet" });
  });

  it("uses standard getrawtransaction for 64-hex hash", async () => {
    const query = "a".repeat(64);
    const fullHash = `0x${query}`;
    safeRpc.mockImplementation(async (method, params) => {
      if (method === "getrawtransaction" && params?.[0] === fullHash) {
        return { hash: fullHash, blockindex: 99 };
      }
      return null;
    });

    const { searchService } = await import("../../src/services/searchService.js");
    const result = await searchService.search(query);

    expect(safeRpc).toHaveBeenCalledWith("getrawtransaction", [fullHash, 1], null, { network: "mainnet" });
    expect(safeRpc).not.toHaveBeenCalledWith(
      "GetRawTransactionByTransactionHash",
      expect.any(Object),
      expect.any(Object),
    );
    expect(result.type).toBe("transaction");
  });
});
