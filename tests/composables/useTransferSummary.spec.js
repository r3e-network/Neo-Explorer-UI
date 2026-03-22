import { describe, expect, it, vi, beforeEach } from "vitest";

const getTransfersByTxHashMock = vi.fn();
const getNep11TransfersByTxHashMock = vi.fn();

vi.mock("@/services", () => ({
  tokenService: {
    getTransfersByTxHash: getTransfersByTxHashMock,
    getNep11TransfersByTxHash: getNep11TransfersByTxHashMock,
  },
}));

describe("useTransferSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTransfersByTxHashMock.mockResolvedValue({ result: [], totalCount: 0 });
    getNep11TransfersByTxHashMock.mockResolvedValue({ result: [], totalCount: 0 });
  });

  it("ignores mint-back transfers to the sender when choosing the summary recipient and token", async () => {
    const txHash = "0xtx-summary";
    const sender = "NMBAoPYQW15f9qxr7WiQd3rNnQJYX4Wwwc";
    const target = "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp";

    getTransfersByTxHashMock.mockResolvedValueOnce({
      result: [
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
      ],
      totalCount: 2,
    });

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
});
