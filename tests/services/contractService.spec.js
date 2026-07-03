import { beforeEach, describe, expect, it, vi } from "vitest";

const safeRpcMock = vi.hoisted(() => vi.fn());
const safeRpcListMock = vi.hoisted(() => vi.fn());
const getContractsMock = vi.hoisted(() => vi.fn());
const getContractCallsMock = vi.hoisted(() => vi.fn());
const getContractNotificationsMock = vi.hoisted(() => vi.fn());
const getContractOverviewMock = vi.hoisted(() => vi.fn());

vi.mock("../../src/services/api.js", () => ({
  safeRpc: safeRpcMock,
  safeRpcList: safeRpcListMock,
}));

vi.mock("../../src/services/indexerReadService.js", () => ({
  indexerReadService: {
    getContracts: getContractsMock,
    getContractCalls: getContractCallsMock,
    getContractNotifications: getContractNotificationsMock,
    getContractOverview: getContractOverviewMock,
  },
}));

describe("contractService manifest fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getContractsMock.mockRejectedValue(new Error("indexer offline"));
    getContractCallsMock.mockRejectedValue(new Error("indexer offline"));
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

// Read-api-first fallback chain (#168 + #169) for getScCalls.
describe("contractService.getScCalls fallback chain", () => {
  const HASH = "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5"; // NEO native

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Default: indexer calls/notifications offline so later sources are unreachable unless enabled per test.
    getContractCallsMock.mockRejectedValue(new Error("indexer calls offline"));
    getContractNotificationsMock.mockRejectedValue(new Error("indexer offline"));
  });

  it("Source 1: returns rows from the short read-api contract calls route", async () => {
    getContractOverviewMock.mockResolvedValueOnce({ tx_count: 1234 });
    getContractCallsMock.mockResolvedValueOnce({
      data: [
        { txid: "0x1111111111111111111111111111111111111111111111111111111111111111", block_index: 100, first_event_name: "Transfer", call_flags: "All", origin_sender: "Nfoo" },
        { txid: "0x2222222222222222222222222222222222222222222222222222222222222222", block_index: 99, first_event_name: "Mint", callFlags: "ReadOnly", origin_sender: "Nbar" },
      ],
      paging: { total: 1234 },
    });
    const fetchMock = vi.fn(async () => ({ ok: false }));
    vi.stubGlobal("fetch", fetchMock);

    const { contractService } = await import("../../src/services/contractService.js");
    const result = await contractService.getScCalls(HASH, 20, 0);

    expect(getContractCallsMock).toHaveBeenCalledWith(
      HASH,
      20,
      0,
      expect.objectContaining({ timeoutMs: 12000 }),
    );
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/contract_calls"))).toBe(false);
    expect(result).toEqual({
      result: [
        { txid: "0x1111111111111111111111111111111111111111111111111111111111111111", blockindex: 100, method: "Transfer", callFlags: "All", originSender: "Nfoo" },
        { txid: "0x2222222222222222222222222222222222222222222222222222222222222222", blockindex: 99, method: "Mint", callFlags: "ReadOnly", originSender: "Nbar" },
      ],
      totalCount: 1234,
    });
    expect(safeRpcListMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("Source 2: returns rows from /rest/v1/contract_calls when explicitly enabled", async () => {
    const restRows = [
      { txid: "0x1111111111111111111111111111111111111111111111111111111111111111", block_index: 100, first_event_name: "Transfer", call_flags: "All", origin_sender: "Nfoo" },
      { txid: "0x2222222222222222222222222222222222222222222222222222222222222222", block_index: 99, first_event_name: "Mint", callFlags: "ReadOnly", origin_sender: "Nbar" },
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
    const result = await contractService.getScCalls(HASH, 20, 0, { enableContractCallsRest: true });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/contract_calls"),
      expect.any(Object),
    );
    expect(result).toEqual({
      result: [
        { txid: "0x1111111111111111111111111111111111111111111111111111111111111111", blockindex: 100, method: "Transfer", callFlags: "All", originSender: "Nfoo" },
        { txid: "0x2222222222222222222222222222222222222222222222222222222222222222", blockindex: 99, method: "Mint", callFlags: "ReadOnly", originSender: "Nbar" },
      ],
      totalCount: 1234,
    });
    // Legacy RPC must not be touched.
    expect(safeRpcListMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("Source 3: falls back to client-side derivation when direct calls and REST are unavailable", async () => {
    getContractOverviewMock.mockResolvedValue({ tx_count: 99 });
    const fetchMock = vi.fn(async (url) => {
      if (url.includes("/contract_calls")) return { ok: false, status: 404, json: async () => null };
      if (url.includes("/transaction_signers")) {
        return { ok: true, json: async () => [{ txid: "0x1111111111111111111111111111111111111111111111111111111111111111", account: "Nsender", position: 0 }] };
      }
      return { ok: false };
    });
    vi.stubGlobal("fetch", fetchMock);

    getContractNotificationsMock.mockResolvedValueOnce({
      data: [
        { txid: "0x1111111111111111111111111111111111111111111111111111111111111111", block_index: 50, event_name: "Transfer" },
        { txid: "0x1111111111111111111111111111111111111111111111111111111111111111", block_index: 50, event_name: "Approval" }, // duplicate dedup'd
      ],
      paging: { total: 50 },
    });

    const { contractService } = await import("../../src/services/contractService.js");
    const result = await contractService.getScCalls(HASH, 20, 0, { enableContractCallsRest: true });

    expect(getContractNotificationsMock).toHaveBeenCalled();
    expect(result.result).toEqual([
      { txid: "0x1111111111111111111111111111111111111111111111111111111111111111", blockindex: 50, method: "Transfer", callFlags: "—", originSender: "Nsender" },
    ]);
    expect(result.totalCount).toBe(99);
    expect(safeRpcListMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("does not keep probing the dedicated REST endpoint after it returns unsupported", async () => {
    getContractOverviewMock.mockResolvedValue({ tx_count: 2 });
    getContractNotificationsMock.mockResolvedValue({
      data: [{ txid: "0x1111111111111111111111111111111111111111111111111111111111111111", block_index: 50, event_name: "Transfer" }],
      paging: { total: 1 },
    });
    const fetchMock = vi.fn(async (url) => {
      if (url.includes("/contract_calls")) return { ok: false, status: 404, json: async () => null };
      if (url.includes("/transaction_signers")) return { ok: true, json: async () => [] };
      return { ok: false };
    });
    vi.stubGlobal("fetch", fetchMock);

    const { contractService } = await import("../../src/services/contractService.js");
    await contractService.getScCalls(HASH, 20, 0, { enableContractCallsRest: true });
    await contractService.getScCalls(HASH, 20, 20, { enableContractCallsRest: true });

    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/contract_calls"))).toHaveLength(1);

    vi.unstubAllGlobals();
  });

  it("skips the dedicated REST endpoint by default until the read-api route is enabled", async () => {
    getContractOverviewMock.mockResolvedValue({ tx_count: 1 });
    getContractCallsMock.mockRejectedValueOnce(new Error("indexer calls unavailable"));
    getContractNotificationsMock.mockResolvedValue({
      data: [{ txid: "0x1111111111111111111111111111111111111111111111111111111111111111", block_index: 50, event_name: "Transfer" }],
      paging: { total: 1 },
    });
    const fetchMock = vi.fn(async (url) => {
      if (url.includes("/transaction_signers")) return { ok: true, json: async () => [] };
      return { ok: false };
    });
    vi.stubGlobal("fetch", fetchMock);

    const { contractService } = await import("../../src/services/contractService.js");
    await contractService.getScCalls(HASH, 20, 0);

    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/contract_calls"))).toBe(false);

    vi.unstubAllGlobals();
  });

  it("Source 3: attributes originSender to the minimum signer_index (signers[0]) for a multi-signer tx (#23fe)", async () => {
    const TXID = "0x1111111111111111111111111111111111111111111111111111111111111111";
    getContractOverviewMock.mockResolvedValue({ tx_count: 7 });
    // transaction_signers rows arrive in the read-api's fixed indexed_at desc
    // primary sort (order= is ignored), which can surface the HIGHEST signer
    // index first. Neo semantics: the origin sender is signers[0] — the
    // LOWEST signer_index. The service must pick min(signer_index) client-side.
    let signerSelect = "";
    const fetchMock = vi.fn(async (url) => {
      if (url.includes("/contract_calls")) return { ok: false, status: 404, json: async () => null };
      if (url.includes("/transaction_signers")) {
        signerSelect = new URL(url, "http://x").searchParams.get("select");
        return {
          ok: true,
          json: async () => [
            { txid: TXID, account: "Nsigner2", signer_index: 2 },
            { txid: TXID, account: "Nsigner0", signer_index: 0 },
            { txid: TXID, account: "Nsigner1", signer_index: 1 },
          ],
        };
      }
      return { ok: false };
    });
    vi.stubGlobal("fetch", fetchMock);

    getContractNotificationsMock.mockResolvedValueOnce({
      data: [{ txid: TXID, block_index: 50, event_name: "Transfer" }],
      paging: { total: 7 },
    });

    const { contractService } = await import("../../src/services/contractService.js");
    const result = await contractService.getScCalls(HASH, 20, 0, { enableContractCallsRest: true });

    // Requests the REAL emitted column, not the nonexistent `position`.
    expect(signerSelect).toBe("txid,account,signer_index");
    const signerUrl = fetchMock.mock.calls
      .map(([url]) => String(url))
      .find((url) => url.includes("/transaction_signers"));
    expect(signerUrl).not.toContain("order=");
    expect(signerUrl).not.toContain("position");
    // signers[0] (signer_index 0) wins despite arriving second in the payload.
    expect(result.result).toEqual([
      { txid: TXID, blockindex: 50, method: "Transfer", callFlags: "—", originSender: "Nsigner0" },
    ]);

    vi.unstubAllGlobals();
  });

  it("Source 3: degrades to the first row when signer_index is absent (older backend) (#23fe)", async () => {
    const TXID = "0x1111111111111111111111111111111111111111111111111111111111111111";
    getContractOverviewMock.mockResolvedValue({ tx_count: 3 });
    const fetchMock = vi.fn(async (url) => {
      if (url.includes("/contract_calls")) return { ok: false, status: 404, json: async () => null };
      if (url.includes("/transaction_signers")) {
        // No signer_index field at all — mimic a pre-migration backend.
        return {
          ok: true,
          json: async () => [
            { txid: TXID, account: "NfirstRow" },
            { txid: TXID, account: "NsecondRow" },
          ],
        };
      }
      return { ok: false };
    });
    vi.stubGlobal("fetch", fetchMock);

    getContractNotificationsMock.mockResolvedValueOnce({
      data: [{ txid: TXID, block_index: 50, event_name: "Transfer" }],
      paging: { total: 3 },
    });

    const { contractService } = await import("../../src/services/contractService.js");
    const result = await contractService.getScCalls(HASH, 20, 0, { enableContractCallsRest: true });

    expect(result.result[0].originSender).toBe("NfirstRow");

    vi.unstubAllGlobals();
  });

  it("Source 3: returns empty when both Postgres paths are empty", async () => {
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
    const result = await contractService.getScCalls(HASH, 20, 0, { enableContractCallsRest: true });

    expect(safeRpcListMock).not.toHaveBeenCalled();
    expect(result).toEqual({ result: [], totalCount: 0 });

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

  it("returns empty when indexer returns empty", async () => {
    getContractsMock.mockResolvedValueOnce({ data: [], paging: { total: 0 } });

    const { contractService } = await import("../../src/services/contractService.js");
    const result = await contractService.getListWithFallback(20, 0);

    expect(result).toEqual({ result: [], totalCount: 0 });
    expect(safeRpcListMock).not.toHaveBeenCalled();
  });
});
