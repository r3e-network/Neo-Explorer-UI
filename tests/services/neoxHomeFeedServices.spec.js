import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchBlockscoutMock, enrichBlocksMock } = vi.hoisted(() => ({
  fetchBlockscoutMock: vi.fn(),
  enrichBlocksMock: vi.fn(async (rows) => rows),
}));

vi.mock("@/services/neox/blockscoutClient", () => ({
  fetchBlockscout: fetchBlockscoutMock,
  LIST_TIMEOUT_MS: 12_000,
}));

vi.mock("@/services/neox/consensusService", () => ({
  enrichBlocksWithConsensus: enrichBlocksMock,
}));

import { clearAllCache } from "@/services/cache";
import { blockService } from "@/services/neox/blockService";
import { transactionService } from "@/services/neox/transactionService";

const rawBlock = (height) => ({
  hash: `0xblock${height}`,
  height,
  timestamp: new Date(height * 1000).toISOString(),
  transactions_count: height,
  size: 799,
});

const rawTx = (height) => ({
  hash: `0xtx${height}`,
  block: height,
  timestamp: new Date(height * 1000).toISOString(),
  status: "ok",
});

beforeEach(() => {
  clearAllCache();
  vi.clearAllMocks();
  enrichBlocksMock.mockImplementation(async (rows) => rows);
});

describe("Neo X rolling home feed services", () => {
  it("backfills the initial four-block snapshot once, then refreshes incrementally", async () => {
    let poll = 0;
    fetchBlockscoutMock.mockImplementation(async (_net, path) => {
      if (path === "main-page/blocks") {
        poll += 1;
        const top = poll === 1 ? 10 : 11;
        return [top, top - 1, top - 2, top - 3].map(rawBlock);
      }
      if (path === "blocks") {
        return { items: [10, 9, 8, 7, 6, 5].map(rawBlock), next_page_params: null };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const first = await blockService.getLatest(6, { net: "neox-mainnet" });
    const second = await blockService.getLatest(6, { net: "neox-mainnet" });

    expect(first.map((row) => row.index)).toEqual([10, 9, 8, 7, 6, 5]);
    expect(second.map((row) => row.index)).toEqual([11, 10, 9, 8, 7, 6]);
    expect(fetchBlockscoutMock.mock.calls.filter(([, path]) => path === "blocks")).toHaveLength(1);
  });

  it("retains older transactions when a later poll only returns a small delta", async () => {
    fetchBlockscoutMock
      .mockResolvedValueOnce([10, 9, 8, 7, 6, 5].map(rawTx))
      .mockResolvedValueOnce([11, 10].map(rawTx));

    await transactionService.getLatest(6, { net: "neox-testnet" });
    const refreshed = await transactionService.getLatest(6, { net: "neox-testnet" });

    expect(refreshed.map((row) => row.blockIndex)).toEqual([11, 10, 9, 8, 7, 6]);
  });
});

