import { describe, expect, it, vi, beforeEach } from "vitest";

const { getTransfersByTxHash, getNep11TransfersByTxHash } = vi.hoisted(() => ({
  getTransfersByTxHash: vi.fn(),
  getNep11TransfersByTxHash: vi.fn(),
}));

vi.mock("@/services", () => ({
  tokenService: {
    getTransfersByTxHash,
    getNep11TransfersByTxHash,
  },
}));

import { useTransferSummary } from "@/composables/useTransferSummary";

describe("useTransferSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts NEP-17 contract hash from lowercase contracthash field", async () => {
    getTransfersByTxHash.mockResolvedValueOnce({
      result: [
        {
          value: "100000000",
          decimals: 8,
          symbol: "GAS",
          contracthash: "0xd2a4cff31913016155e38e474a2c06d08be276cf",
        },
      ],
      totalCount: 1,
    });

    const { enrichTransactions, transferSummaryByHash } = useTransferSummary();

    await enrichTransactions([{ hash: "0xtx", value: 0 }], { maxItems: 1 });

    expect(transferSummaryByHash.value["0xtx"]).toMatchObject({
      text: "1 GAS",
      contract: "0xd2a4cff31913016155e38e474a2c06d08be276cf",
      type: "NEP17",
    });
  });
});
