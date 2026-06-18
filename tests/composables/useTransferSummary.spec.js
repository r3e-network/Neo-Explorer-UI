import { describe, expect, it, vi, beforeEach } from "vitest";

const getTransfersByTxHashesBatchMock = vi.fn();

vi.mock("@/services/tokenService", () => ({
  tokenService: {
    getTransfersByTxHashesBatch: getTransfersByTxHashesBatchMock,
  },
}));

describe("useTransferSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTransfersByTxHashesBatchMock.mockResolvedValue(new Map());
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
});
