import { beforeEach, describe, expect, it } from "vitest";
import { clearAllCache } from "@/services/cache";
import {
  mergeHomeFeedRows,
  readHomeFeed,
  reconcileHomeFeed,
  writeHomeFeed,
} from "@/services/neox/homeFeedCache";

beforeEach(() => clearAllCache());

describe("Neo X rolling home feed cache", () => {
  it("deduplicates and retains the newest six blocks", () => {
    const retained = Array.from({ length: 6 }, (_, index) => ({
      hash: `0x${10 - index}`,
      index: 10 - index,
    }));
    const incoming = [
      { hash: "0x12", index: 12 },
      { hash: "0x11", index: 11 },
      { hash: "0x10", index: 10, txCount: 2 },
    ];

    const rows = mergeHomeFeedRows(incoming, retained, "blocks", 6);
    expect(rows.map((row) => row.index)).toEqual([12, 11, 10, 9, 8, 7]);
    expect(rows.find((row) => row.index === 10)?.txCount).toBe(2);
  });

  it("persists isolated per-network windows without raw payloads", () => {
    writeHomeFeed("neox-mainnet", "transactions", [
      { hash: "0xmain", timestampMs: 20, raw: { oversized: true } },
    ]);
    writeHomeFeed("neox-testnet", "transactions", [
      { hash: "0xtest", timestampMs: 10 },
    ]);

    expect(readHomeFeed("neox-mainnet", "transactions")).toEqual([
      { hash: "0xmain", timestampMs: 20 },
    ]);
    expect(readHomeFeed("neox-testnet", "transactions")[0].hash).toBe("0xtest");
  });

  it("preserves existing row identity while prepending new observations", () => {
    const existing = { hash: "0xold", blockIndex: 10, timestampMs: 10, confirmations: 1 };
    const rows = reconcileHomeFeed(
      [existing],
      [
        { hash: "0xnew", blockIndex: 11, timestampMs: 11 },
        { hash: "0xold", blockIndex: 10, timestampMs: 10, confirmations: 2 },
      ],
      "transactions",
      6,
    );

    expect(rows[0].hash).toBe("0xnew");
    expect(rows[1]).toBe(existing);
    expect(rows[1].confirmations).toBe(2);
  });
});

