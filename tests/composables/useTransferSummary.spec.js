import { describe, expect, it, vi, beforeEach } from "vitest";

const getTransfersByTxHashesBatchMock = vi.fn();
const getByHashWithFallbackMock = vi.fn();
const envState = vi.hoisted(() => ({ network: "mainnet" }));

vi.mock("@/services/tokenService", () => ({
  tokenService: {
    getTransfersByTxHashesBatch: getTransfersByTxHashesBatchMock,
    getByHashWithFallback: getByHashWithFallbackMock,
  },
}));

vi.mock("@/utils/env", () => ({
  NET_ENV: {
    Mainnet: "Mainnet",
    TestT5: "TestT5",
  },
  NETWORK_CHANGE_EVENT: "neo-explorer-network-change",
  getCurrentEnv: vi.fn(() => (envState.network === "testnet" ? "TestT5" : "Mainnet")),
  resolveNetworkName: vi.fn((env) => {
    const value = String(env || envState.network || "mainnet").toLowerCase();
    return value.includes("test") || value.includes("t5") ? "testnet" : "mainnet";
  }),
}));

describe("useTransferSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envState.network = "mainnet";
    getTransfersByTxHashesBatchMock.mockResolvedValue(new Map());
    getByHashWithFallbackMock.mockResolvedValue(null);
  });

  it("ignores mint-back transfers to the sender when choosing the summary recipient and token", async () => {
    const txHash = "0xtx-summary";
    const sender = "NMBAoPYQW15f9qxr7WiQd3rNnQJYX4Wwwc";
    const target = "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp";

    getTransfersByTxHashesBatchMock.mockResolvedValueOnce(
      new Map([[txHash, [
        {
          from: null,
          to: sender,
          value: "100000",
          decimals: 8,
          symbol: "GAS",
          contract: "0xd2a4cff31913016155e38e474a2c06d08be276cf",
        },
        {
          from: sender,
          to: target,
          value: "100000000",
          decimals: 8,
          symbol: "bNEO",
          contract: "0x48c40d4666f93408be1bef038b6722404d9a4c2a",
        },
      ]]]),
    );

    const { useTransferSummary } = await import("@/composables/useTransferSummary");
    const { transferSummaryByHash, enrichTransactions } = useTransferSummary();

    await enrichTransactions([{ hash: txHash, value: 0 }], { maxItems: 1 });

    expect(transferSummaryByHash.value[txHash]).toMatchObject({
      text: "1 bNEO",
      contract: "0x48c40d4666f93408be1bef038b6722404d9a4c2a",
      recipient: target,
      recipientType: "address",
      targetCount: 1,
      singleTarget: true,
    });
  });

  it("scales GAS amount by native decimals even when the indexer row carries no decimals field", async () => {
    // Reproduces the bug from /transaction-info/0x27696d97...:
    // indexer's nep11_transfers/nep17_transfers rows ship `amount_raw`
    // unscaled (e.g. "498414498" for 4.98... GAS) and don't carry a
    // decimals column. Without a fallback to NATIVE_CONTRACTS the
    // homepage rendered the raw integer.
    const txHash = "0xtx-gas-decimals";
    const sender = "NfM1VMnxEJkaTHCK9kgKYRuZQLv5ghC7HC";
    const target = "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp";

    getTransfersByTxHashesBatchMock.mockResolvedValueOnce(
      new Map([[txHash, [
        {
          from: sender,
          to: target,
          amount: "498414498",
          contract: "0xd2a4cff31913016155e38e474a2c06d08be276cf",
        },
      ]]]),
    );

    const { useTransferSummary } = await import("@/composables/useTransferSummary");
    const { transferSummaryByHash, enrichTransactions } = useTransferSummary();

    await enrichTransactions([{ hash: txHash, value: 0 }], { maxItems: 1 });

    expect(transferSummaryByHash.value[txHash].text).toBe("4.98414498 GAS");
  });

  it("omits the generic 'Token' label when no symbol is known for the contract", async () => {
    const txHash = "0xtx-no-symbol";
    const sender = "NfM1VMnxEJkaTHCK9kgKYRuZQLv5ghC7HC";
    const target = "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp";

    getTransfersByTxHashesBatchMock.mockResolvedValueOnce(
      new Map([[txHash, [
        {
          from: sender,
          to: target,
          amount: "100",
          contract: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
          // no symbol, no decimals — unknown contract
        },
      ]]]),
    );

    const { useTransferSummary } = await import("@/composables/useTransferSummary");
    const { transferSummaryByHash, enrichTransactions } = useTransferSummary();

    await enrichTransactions([{ hash: txHash, value: 0 }], { maxItems: 1 });

    // Bare number, no trailing "Token" placeholder.
    expect(transferSummaryByHash.value[txHash].text).toBe("100");
  });

  it("routes transfer summary lookups through the active network", async () => {
    envState.network = "testnet";
    const txHash = "0xtx-testnet-route";

    const { useTransferSummary } = await import("@/composables/useTransferSummary");
    const { enrichTransactions } = useTransferSummary();

    await enrichTransactions([{ hash: txHash, value: 0 }], { maxItems: 1 });

    expect(getTransfersByTxHashesBatchMock).toHaveBeenCalledWith([txHash], "nep17", { network: "testnet" });
    expect(getTransfersByTxHashesBatchMock).toHaveBeenCalledWith([txHash], "nep11", { network: "testnet" });
  });

  it("drops stale transfer summaries when the network changes while a lookup is in flight", async () => {
    const txHash = "0xtx-stale-network";
    let resolveNep17;
    getTransfersByTxHashesBatchMock.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveNep17 = resolve;
      }),
    );

    const { useTransferSummary } = await import("@/composables/useTransferSummary");
    const { transferSummaryByHash, enrichTransactions } = useTransferSummary();

    const pending = enrichTransactions([{ hash: txHash, value: 0 }], { maxItems: 1 });
    envState.network = "testnet";
    resolveNep17(
      new Map([[txHash, [
        {
          from: "Nfrom",
          to: "Nto",
          value: "1",
          symbol: "OLD",
          contract: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
      ]]]),
    );
    await pending;

    expect(transferSummaryByHash.value[txHash]).toBeUndefined();
  });

  it("keeps fetched token decimals isolated by network", async () => {
    const contract = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const mainTxHash = "0xtx-main-decimals";
    const testTxHash = "0xtx-test-decimals";

    getByHashWithFallbackMock
      .mockResolvedValueOnce({ decimals: 8 })
      .mockResolvedValueOnce({ decimals: 2 });

    getTransfersByTxHashesBatchMock.mockImplementation(async (hashes, standard) => {
      if (standard !== "nep17") return new Map();
      if (hashes[0] === mainTxHash) {
        return new Map([[mainTxHash, [
          { from: "Nfrom", to: "Nto", value: "100000000", symbol: "TOK", contract },
        ]]]);
      }
      if (hashes[0] === testTxHash) {
        return new Map([[testTxHash, [
          { from: "Nfrom", to: "Nto", value: "100", symbol: "TOK", contract },
        ]]]);
      }
      return new Map();
    });

    const { useTransferSummary } = await import("@/composables/useTransferSummary");
    const { transferSummaryByHash, enrichTransactions, clearTransferSummaries } = useTransferSummary();

    await enrichTransactions([{ hash: mainTxHash, value: 0 }], { maxItems: 1 });
    expect(transferSummaryByHash.value[mainTxHash].text).toBe("1 TOK");

    envState.network = "testnet";
    clearTransferSummaries();
    await enrichTransactions([{ hash: testTxHash, value: 0 }], { maxItems: 1 });

    expect(transferSummaryByHash.value[testTxHash].text).toBe("1 TOK");
    expect(getByHashWithFallbackMock).toHaveBeenNthCalledWith(1, contract, { network: "mainnet" });
    expect(getByHashWithFallbackMock).toHaveBeenNthCalledWith(2, contract, { network: "testnet" });
  });
});
