import { describe, it, expect } from "vitest";
import {
  getAddressDetailTabs,
  normalizeAccountSummary,
  splitAddressAssets,
  normalizeAddressTransactions,
  getPageCount,
} from "../../src/utils/addressDetail";

describe("addressDetail utils", () => {
  it("returns standard address detail tabs", () => {
    expect(getAddressDetailTabs()).toEqual([
      { key: "transactions", label: "Transactions" },
      { key: "tokens", label: "Token Holdings" },
      { key: "nfts", label: "NFTs" },
    ]);
  });

  it("normalizes account summary from mixed backend fields", () => {
    expect(
      normalizeAccountSummary(
        {
          neo: "12.5",
          gas: "4.2",
          txcount: 9,
        },
        [{}, {}, {}]
      )
    ).toEqual({
      neoBalance: "12.5",
      gasBalance: "4.2",
      txCount: 9,
      tokenCount: 3,
    });
  });

  it("splits fungible and nft assets", () => {
    const input = [
      { standard: "NEP17", symbol: "GAS" },
      { type: "NEP11", symbol: "NFTA" },
      { standard: "NEP11", symbol: "NFTB" },
      { standard: "NEP17", symbol: "NEO" },
    ];

    const { fungibleAssets, nftAssets } = splitAddressAssets(input);

    expect(fungibleAssets).toHaveLength(2);
    expect(nftAssets).toHaveLength(2);
  });

  it("normalizes address transactions to a shared shape", () => {
    const txs = normalizeAddressTransactions([
      {
        txid: "0xabc",
        timestamp: 1700000000,
        sender: "Nabc",
        vmstate: "HALT",
        size: 244,
      },
    ]);

    expect(txs).toEqual([
      {
        hash: "0xabc",
        blocktime: 1700000000,
        sender: "Nabc",
        vmstate: "HALT",
        size: 244,
      },
    ]);
  });

  it("calculates safe page counts", () => {
    expect(getPageCount(0, 10)).toBe(1);
    expect(getPageCount(19, 10)).toBe(2);
    expect(getPageCount(30, 10)).toBe(3);
  });
});
