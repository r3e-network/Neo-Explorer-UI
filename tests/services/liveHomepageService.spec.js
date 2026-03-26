import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.fn();

vi.mock("@/services/api", () => ({
  rpc: rpcMock,
}));

describe("liveHomepageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockImplementation(async (method, params = []) => {
      if (method === "getblockcount") return 103;
      if (method === "getblock") {
        const [height, verbose] = params;
        expect(verbose).toBe(true);
        return {
          hash: `0xblock-${height}`,
          index: height,
          size: 697,
          time: 1_700_000_000 + height,
          primary: height % 7,
          nextconsensus: "NXZSaAQyqS8aF9t9MPJSUffiK15f1eiwWc",
          tx: height === 102 ? [{ hash: "0xtx-102", sender: "NAddr", sysfee: "10", netfee: "2", vmstate: "HALT" }] : [],
        };
      }
      throw new Error(`unexpected rpc method ${method}`);
    });
  });

  it("returns aligned latest blocks and transactions from the same RPC block set", async () => {
    const { getLatestHomepageSnapshot } = await import("../../src/services/liveHomepageService.js");
    const result = await getLatestHomepageSnapshot({ blockLimit: 3, txLimit: 2 });

    expect(rpcMock).toHaveBeenCalledWith("getblockcount", []);
    expect(rpcMock).toHaveBeenCalledWith("getblock", [102, true]);
    expect(result.blocks.map((block) => block.index)).toEqual([102, 101, 100]);
    expect(result.transactions.map((tx) => tx.hash)).toEqual(["0xtx-102"]);
    expect(result.blocks[0]).toEqual(
      expect.objectContaining({
        hash: "0xblock-102",
        timestamp: (1_700_000_000 + 102) * 1000,
        txcount: 1,
      }),
    );
    expect(result.transactions[0]).toEqual(
      expect.objectContaining({
        hash: "0xtx-102",
        blocktime: (1_700_000_000 + 102) * 1000,
        sender: "NAddr",
        vmstate: "HALT",
      }),
    );
  });

  it("backfills vmstate and status from application logs when block transactions omit execution state", async () => {
    rpcMock.mockImplementation(async (method, params = []) => {
      if (method === "getblockcount") return 52;
      if (method === "getblock") {
        const [height, verbose] = params;
        expect(verbose).toBe(true);
        return {
          hash: `0xblock-${height}`,
          index: height,
          size: 697,
          time: 1_700_100_000 + height,
          tx:
            height === 51
              ? [{ hash: "0xtx-51", sender: "NAddr2", sysfee: "5", netfee: "1" }]
              : [],
        };
      }
      if (method === "getapplicationlog") {
        expect(params).toEqual(["0xtx-51"]);
        return {
          executions: [{ vmstate: "HALT" }],
        };
      }
      throw new Error(`unexpected rpc method ${method}`);
    });

    const { getLatestHomepageSnapshot } = await import("../../src/services/liveHomepageService.js");
    const result = await getLatestHomepageSnapshot({ blockLimit: 2, txLimit: 1 });

    expect(rpcMock).toHaveBeenCalledWith("getapplicationlog", ["0xtx-51"]);
    expect(result.transactions[0]).toEqual(
      expect.objectContaining({
        hash: "0xtx-51",
        vmstate: "HALT",
        status: "success",
      }),
    );
  });
});
