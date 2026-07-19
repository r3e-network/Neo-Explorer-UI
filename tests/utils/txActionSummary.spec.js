import { describe, it, expect } from "vitest";
import { buildTxActionSummary } from "../../src/utils/txActionSummary.js";

const ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

describe("buildTxActionSummary", () => {
  it("returns null for empty/missing transactions", () => {
    expect(buildTxActionSummary(null)).toBeNull();
    expect(buildTxActionSummary(undefined)).toBeNull();
    expect(buildTxActionSummary("0xabc")).toBeNull();
    expect(buildTxActionSummary({})).toBeNull();
    expect(buildTxActionSummary({ value: "0", tokenTransfers: [] })).toBeNull();
  });

  it("summarizes contract deployments (name preferred, hash fallback)", () => {
    expect(
      buildTxActionSummary({ createdContract: { hash: ADDRESS, name: "MyToken" } })
    ).toEqual({ kind: "deploy", contract: "MyToken" });

    expect(buildTxActionSummary({ createdContract: { hash: ADDRESS } })).toEqual({
      kind: "deploy",
      contract: ADDRESS,
    });
  });

  it("deployment wins over transfers, value, and method", () => {
    const summary = buildTxActionSummary({
      createdContract: { hash: ADDRESS, name: "Factory" },
      tokenTransfers: [{ token: { symbol: "USDT", decimals: "6" }, total: { value: "1000000" } }],
      value: "1000000000000000000",
      method: "deploy",
    });
    expect(summary.kind).toBe("deploy");
  });

  it("summarizes token transfers with formatted amounts and mint/burn directions", () => {
    const summary = buildTxActionSummary({
      value: "0",
      tokenTransfers: [
        {
          type: "token_minting",
          token: { symbol: "USDT", decimals: "6" },
          total: { value: "2500000", decimals: "6" },
        },
        {
          type: "token_burning",
          token: { symbol: "WGAS", decimals: 18 },
          total: { value: "1000000000000000000" },
        },
        {
          type: "token_transfer",
          token: { symbol: "XYZ", decimals: 18 },
          total: { value: "1" },
        },
      ],
    });
    expect(summary.kind).toBe("transfers");
    expect(summary.count).toBe(3);
    expect(summary.items).toHaveLength(2);
    expect(summary.items[0]).toEqual({ amount: "2.5", symbol: "USDT", tokenId: null, direction: "mint" });
    expect(summary.items[1]).toEqual({ amount: "1", symbol: "WGAS", tokenId: null, direction: "burn" });
  });

  it("summarizes NFT transfers via token_id when there is no fungible value", () => {
    const summary = buildTxActionSummary({
      tokenTransfers: [
        {
          type: "token_transfer",
          token: { symbol: "PUNK" },
          total: { token_id: "42" },
        },
      ],
    });
    expect(summary).toEqual({
      kind: "transfers",
      count: 1,
      items: [{ amount: null, symbol: "PUNK", tokenId: "42", direction: null }],
    });
  });

  it("summarizes native GAS sends with the recipient name or short hash", () => {
    const named = buildTxActionSummary({
      value: "1500000000000000000",
      to: ADDRESS,
      toInfo: { name: "Binance" },
      tokenTransfers: [],
    });
    expect(named).toEqual({ kind: "send", amount: "1.5", to: "Binance" });

    const bare = buildTxActionSummary({ value: "1000000000000000000", to: ADDRESS });
    expect(bare.kind).toBe("send");
    expect(bare.amount).toBe("1");
    expect(bare.to).toBe("0x123456…5678");
  });

  it("summarizes zero-value method calls with the target name or short hash", () => {
    const named = buildTxActionSummary({
      value: "0",
      method: "approve",
      to: ADDRESS,
      toInfo: { name: "Uniswap Router" },
    });
    expect(named).toEqual({ kind: "call", method: "approve", target: "Uniswap Router" });

    const bare = buildTxActionSummary({ method: "transferFrom", to: ADDRESS });
    expect(bare).toEqual({ kind: "call", method: "transferFrom", target: "0x123456…5678" });
  });

  it("treats malformed values as zero and falls through to the method branch", () => {
    const summary = buildTxActionSummary({ value: "not-a-number", method: "ping", to: ADDRESS });
    expect(summary.kind).toBe("call");
  });
});
