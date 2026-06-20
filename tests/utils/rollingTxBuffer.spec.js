import { describe, it, expect, vi } from "vitest";
import {
  createRollingTxBuffer,
  feePercentileEstimates,
  txTotalFee,
} from "../../src/utils/rollingTxBuffer.js";

const mkTx = (txid, sysFee = 100, netFee = 50) => ({
  txid,
  sys_fee: sysFee,
  net_fee: netFee,
});

describe("createRollingTxBuffer", () => {
  it("first refresh fetches initialPages × pageSize and stores newest-first", async () => {
    const fetchPage = vi.fn(async (limit, offset) =>
      Array.from({ length: limit }, (_, i) => mkTx(`t-${offset + i}`)),
    );
    const buffer = createRollingTxBuffer({
      fetchPage,
      initialPages: 3,
      pageSize: 50,
      target: 1000,
    });

    await buffer.refresh();

    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 50, 0, expect.any(Object));
    expect(fetchPage).toHaveBeenNthCalledWith(2, 50, 50, expect.any(Object));
    expect(fetchPage).toHaveBeenNthCalledWith(3, 50, 100, expect.any(Object));
    expect(buffer.entries).toHaveLength(150);
    expect(buffer.entries[0].txid).toBe("t-0");
    expect(buffer.lastSeenTxid).toBe("t-0");
  });

  it("subsequent refresh fetches incrementalSize, prepends delta, trims to target", async () => {
    const fetchPage = vi.fn();
    // First call: 3 pages of 50 = 150 tx.
    fetchPage
      .mockResolvedValueOnce(Array.from({ length: 50 }, (_, i) => mkTx(`A-${i}`)))
      .mockResolvedValueOnce(Array.from({ length: 50 }, (_, i) => mkTx(`A-${i + 50}`)))
      .mockResolvedValueOnce(Array.from({ length: 50 }, (_, i) => mkTx(`A-${i + 100}`)));

    const buffer = createRollingTxBuffer({
      fetchPage,
      initialPages: 3,
      pageSize: 50,
      incrementalSize: 30,
      target: 100,
    });

    await buffer.refresh();
    expect(buffer.entries).toHaveLength(100); // trimmed from 150 → 100
    const beforeFirstId = buffer.entries[0].txid;

    // Second call: 30 newer than the buffer's head, then the head txid
    // appears as the boundary.
    fetchPage.mockResolvedValueOnce([
      ...Array.from({ length: 5 }, (_, i) => mkTx(`B-${i}`)),
      mkTx(beforeFirstId),
      mkTx("A-old"),
    ]);

    await buffer.refresh();

    // 5 new entries should be prepended, 5 oldest trimmed.
    expect(fetchPage).toHaveBeenLastCalledWith(30, 0, expect.any(Object));
    expect(buffer.entries[0].txid).toBe("B-0");
    expect(buffer.entries[4].txid).toBe("B-4");
    expect(buffer.entries[5].txid).toBe(beforeFirstId);
    expect(buffer.entries).toHaveLength(100);
    expect(buffer.lastSeenTxid).toBe("B-0");
  });

  it("incremental refresh with no new txids leaves buffer unchanged", async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce([mkTx("a"), mkTx("b"), mkTx("c")])
      .mockResolvedValueOnce([mkTx("a"), mkTx("b"), mkTx("c")]); // same head
    const buffer = createRollingTxBuffer({ fetchPage, initialPages: 1, pageSize: 3, target: 100 });

    await buffer.refresh();
    expect(buffer.entries).toHaveLength(3);

    await buffer.refresh();
    expect(buffer.entries).toHaveLength(3);
    expect(buffer.entries[0].txid).toBe("a");
  });

  it("forceRefresh is forwarded to fetchPage but does not rebuild the buffer", async () => {
    const fetchPage = vi.fn().mockResolvedValue([mkTx("t-0"), mkTx("t-1")]);
    const buffer = createRollingTxBuffer({ fetchPage, initialPages: 1, pageSize: 2 });

    await buffer.refresh();
    expect(fetchPage.mock.calls[0][2]).toEqual({ forceRefresh: false });

    await buffer.refresh(true);
    // Second call is incremental with limit=incrementalSize, NOT a re-fill.
    const lastCall = fetchPage.mock.calls[fetchPage.mock.calls.length - 1];
    expect(lastCall[2]).toEqual({ forceRefresh: true });
    // Three calls total: 1 initial + 1 incremental + 0 (the test asserted on lastCall)
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("forwards additional request options to every fetchPage call", async () => {
    const fetchPage = vi.fn().mockResolvedValue([mkTx("t-0")]);
    const buffer = createRollingTxBuffer({ fetchPage, initialPages: 1, pageSize: 1 });

    await buffer.refresh(true, { network: "testnet" });

    expect(fetchPage).toHaveBeenCalledWith(1, 0, {
      forceRefresh: true,
      network: "testnet",
    });
  });

  it("reset() clears entries so the next refresh re-runs initial fill", async () => {
    const fetchPage = vi.fn().mockResolvedValue([mkTx("a")]);
    const buffer = createRollingTxBuffer({ fetchPage, initialPages: 1, pageSize: 1 });
    await buffer.refresh();
    buffer.reset();
    expect(buffer.entries).toEqual([]);
    await buffer.refresh();
    // First call after reset should re-do initial fill (1 page × initialPages=1).
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("throws if fetchPage isn't a function", () => {
    expect(() => createRollingTxBuffer({})).toThrow(/fetchPage is required/);
  });
});

describe("feePercentileEstimates", () => {
  it("returns 0/0/0 for empty input", () => {
    expect(feePercentileEstimates([])).toEqual({ low: 0, average: 0, high: 0 });
  });

  it("ignores zero-fee rows", () => {
    expect(feePercentileEstimates([0, 0, 100])).toEqual({ low: 100, average: 100, high: 100 });
  });

  it("returns 25th/50th/75th percentile of sorted fees", () => {
    // 100 tx with fees 1..100 → p25=25, p50=50, p75=75
    const fees = Array.from({ length: 100 }, (_, i) => i + 1);
    const result = feePercentileEstimates(fees);
    expect(result.low).toBe(26);
    expect(result.average).toBe(51);
    expect(result.high).toBe(76);
  });

  it("a single outlier doesn't dominate", () => {
    const fees = [10, 10, 10, 10, 10, 10, 10, 10, 10, 1_000_000];
    const r = feePercentileEstimates(fees);
    expect(r.low).toBe(10);
    expect(r.average).toBe(10);
    // The outlier is in the top 10% — it lands in the .75 bucket per
    // floor(10 * 0.75) = index 7 → fees[7] = 10. Outlier excluded.
    expect(r.high).toBe(10);
  });
});

describe("txTotalFee", () => {
  it("sums sys_fee + net_fee", () => {
    expect(txTotalFee({ sys_fee: 100, net_fee: 50 })).toBe(150);
  });

  it("accepts legacy sysfee/netfee fields", () => {
    expect(txTotalFee({ sysfee: 100, netfee: 50 })).toBe(150);
  });

  it("treats missing or invalid fields as 0", () => {
    expect(txTotalFee({})).toBe(0);
    expect(txTotalFee({ sys_fee: "abc" })).toBe(0);
    expect(txTotalFee(null)).toBe(0);
  });

  it("coerces string fees to numbers", () => {
    expect(txTotalFee({ sys_fee: "100", net_fee: "50" })).toBe(150);
  });
});
