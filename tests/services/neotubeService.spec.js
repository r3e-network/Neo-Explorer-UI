import { beforeEach, describe, expect, it, vi } from "vitest";

const { axiosGetMock, axiosCreateMock } = vi.hoisted(() => {
  const get = vi.fn();
  return {
    axiosGetMock: get,
    axiosCreateMock: vi.fn(() => ({ get })),
  };
});

vi.mock("axios", () => ({
  default: {
    create: axiosCreateMock,
  },
}));

vi.mock("../../src/utils/env.js", () => ({
  NET_ENV: {
    Mainnet: "Mainnet",
    TestT5: "TestT5",
  },
  getCurrentEnv: vi.fn(() => "Mainnet"),
}));

import { __resetNeoTubeAvailabilityForTests, neotubeService } from "../../src/services/neotubeService.js";

describe("neotubeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetNeoTubeAvailabilityForTests();
    axiosGetMock.mockReset();
    axiosCreateMock.mockReset();
    axiosCreateMock.mockReturnValue({ get: axiosGetMock });
  });

  it("maps latest block list to explorer block format", async () => {
    axiosGetMock.mockResolvedValueOnce({
      data: {
        status: "success",
        data: {
          total: 100,
          blocks: [
            {
              hash: "0xblock",
              block_index: 123,
              block_time: 1700000000,
              txs: 2,
              size: 800,
              sys_fee: "0.5",
              net_fee: "0.2",
            },
          ],
        },
      },
    });

    const result = await neotubeService.getLatestBlocks(6, 0, "Mainnet");

    expect(axiosGetMock).toHaveBeenCalledWith(
      "/blocks",
      expect.objectContaining({
        params: { page: 1, page_size: 6 },
        headers: { Network: "mainnet" },
      })
    );
    expect(result).toEqual({
      result: [
        {
          hash: "0xblock",
          index: 123,
          timestamp: 1700000000,
          txcount: 2,
          transactioncount: 2,
          size: 800,
          sysfee: 50000000,
          netfee: 20000000,
        },
      ],
      totalCount: 100,
    });
  });

  it("maps latest transaction list to explorer transaction format", async () => {
    axiosGetMock.mockResolvedValueOnce({
      data: {
        status: "success",
        data: {
          total: 88,
          transactions: [
            {
              hash: "0xtx",
              block_index: 999,
              block_time: 1700000015,
              sender: "NaBC",
              receiver: "NbCD",
              nonce: 10,
              script: "AQID",
              valid_until_block: 1111,
              sys_fee: "0.002",
              net_fee: "0.001",
            },
          ],
        },
      },
    });

    const result = await neotubeService.getLatestTransactions(6, 0, "Mainnet");

    expect(axiosGetMock).toHaveBeenCalledWith(
      "/txs",
      expect.objectContaining({
        params: { page: 1, page_size: 6 },
        headers: { Network: "mainnet" },
      })
    );
    expect(result).toEqual({
      result: [
        {
          hash: "0xtx",
          blockindex: 999,
          blocktime: 1700000015,
          sender: "NaBC",
          from: "NaBC",
          to: "NbCD",
          size: 0,
          nonce: 10,
          script: "AQID",
          validuntilblock: 1111,
          sysfee: 200000,
          netfee: 100000,
          vmstate: undefined,
        },
      ],
      totalCount: 88,
    });
  });

  it("normalizes vmstate from alternate transaction fields", async () => {
    axiosGetMock.mockResolvedValueOnce({
      data: {
        status: "success",
        data: {
          total: 3,
          transactions: [
            { hash: "0x1", block_index: 1, block_time: 1700000015, Vmstate: "FAULT" },
            { hash: "0x2", block_index: 2, block_time: 1700000016, status: "failed" },
            { hash: "0x3", block_index: 3, block_time: 1700000017, state: "HALT, BREAK" },
          ],
        },
      },
    });

    const result = await neotubeService.getLatestTransactions(6, 0, "Mainnet");

    expect(result.result.map((item) => item.vmstate)).toEqual(["FAULT", "FAULT", "HALT"]);
  });

  it("applies non-aligned skip by requesting extra rows and slicing", async () => {
    axiosGetMock.mockResolvedValueOnce({
      data: {
        status: "success",
        data: {
          total: 4,
          transactions: [
            { hash: "0x0", sender: "N0", block_index: 10, block_time: 1000 },
            { hash: "0x1", sender: "N1", block_index: 11, block_time: 1001 },
            { hash: "0x2", sender: "N2", block_index: 12, block_time: 1002 },
          ],
        },
      },
    });

    const result = await neotubeService.getLatestTransactions(2, 1, "Mainnet");

    expect(axiosGetMock).toHaveBeenCalledWith(
      "/txs",
      expect.objectContaining({
        params: { page: 1, page_size: 3 },
        headers: { Network: "mainnet" },
      })
    );
    expect(result.result.map((item) => item.hash)).toEqual(["0x1", "0x2"]);
    expect(result.totalCount).toBe(4);
  });

  it("maps statistics to dashboard stats shape", async () => {
    axiosGetMock.mockResolvedValueOnce({
      data: {
        status: "success",
        data: {
          block_count: 10,
          tx_count: 20,
          addr_count: 30,
          asset_count: 40,
        },
      },
    });

    const stats = await neotubeService.getStatistics("TestT5");

    expect(axiosGetMock).toHaveBeenCalledWith(
      "/statistics",
      expect.objectContaining({
        params: {},
        headers: { Network: "testnet" },
      })
    );
    expect(stats).toEqual({
      blocks: 10,
      txs: 20,
      contracts: 0,
      candidates: 0,
      addresses: 30,
      tokens: 40,
    });
  });

  it("falls back to latest endpoints when statistics counts are missing", async () => {
    axiosGetMock
      .mockResolvedValueOnce({
        data: {
          status: "success",
          data: {
            block_count: 0,
            tx_count: 0,
            addr_count: 30,
            asset_count: 40,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          status: "success",
          data: {
            total: 123,
            blocks: [{ block_index: 122, hash: "0xblock", block_time: 1700000000, txs: 1 }],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          status: "success",
          data: {
            total: 456,
            transactions: [{ hash: "0xtx", block_index: 122, block_time: 1700000000 }],
          },
        },
      });

    const stats = await neotubeService.getStatistics("TestT5");

    expect(stats).toEqual({
      blocks: 123,
      txs: 456,
      contracts: 0,
      candidates: 0,
      addresses: 30,
      tokens: 40,
    });
  });

  it("accepts lowercase testnet alias for network routing", async () => {
    axiosGetMock.mockResolvedValueOnce({
      data: {
        status: "success",
        data: {
          total: 1,
          blocks: [{ hash: "0xblock", block_index: 1, block_time: 1700000000, txs: 0 }],
        },
      },
    });

    await neotubeService.getLatestBlocks(1, 0, "testnet");

    expect(axiosGetMock).toHaveBeenCalledWith(
      "/blocks",
      expect.objectContaining({
        headers: { Network: "testnet" },
      })
    );
  });

  it("throws when NeoTube API returns non-success status", async () => {
    axiosGetMock.mockResolvedValueOnce({
      data: {
        status: "error",
        error_msg: "bad request",
      },
    });

    await expect(neotubeService.getLatestBlocks(6, 0, "Mainnet")).rejects.toThrow("bad request");
  });

  it("reports support only for known environments", () => {
    expect(neotubeService.supportsNetwork("Mainnet")).toBe(true);
    expect(neotubeService.supportsNetwork("TestT5")).toBe(true);
    expect(neotubeService.supportsNetwork("testnet")).toBe(true);
    expect(neotubeService.supportsNetwork("Unknown")).toBe(false);
  });

  it("temporarily disables NeoTube after upstream 403 to avoid repeated failing requests", async () => {
    const forbiddenError = Object.assign(new Error("forbidden"), {
      response: {
        status: 403,
      },
    });

    axiosGetMock.mockRejectedValue(forbiddenError);

    await expect(neotubeService.getLatestBlocks(6, 0, "Mainnet")).rejects.toThrow("forbidden");
    await expect(neotubeService.getLatestBlocks(6, 0, "Mainnet")).rejects.toThrow(
      "NeoTube temporarily unavailable for mainnet"
    );

    expect(axiosGetMock).toHaveBeenCalledTimes(1);
    expect(neotubeService.supportsNetwork("Mainnet")).toBe(false);
  });
});
