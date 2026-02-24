import { describe, it, expect } from "vitest";
import {
  getAddressDetailTabs,
  normalizeAccountSummary,
  pickBestCandidateVotes,
  sumCandidateVoterBalances,
  splitAddressAssets,
  normalizeAddressTransactions,
  getPageCount,
} from "../../src/utils/addressDetail";

describe("addressDetail utils", () => {
  it("returns standard address detail tabs", () => {
    expect(getAddressDetailTabs()).toEqual([
      { key: "transactions", label: "Transactions" },
      { key: "tokenTransfers", label: "Token Transfers" },
      { key: "nftTransfers", label: "NFT Transfers" },
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
        blockhash: "",
        blockIndex: null,
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

  it("prefers non-zero candidate votes over string zero fallback values", () => {
    expect(
      pickBestCandidateVotes(
        { votesOfCandidate: "0" },
        { votes: "542781" },
        { votesOfCandidate: "12" }
      )
    ).toBe("542781");
  });

  it("returns zero when all candidate vote sources are empty", () => {
    expect(pickBestCandidateVotes({ votesOfCandidate: "0" }, null, undefined)).toBe("0");
  });

  it("sums voter balances safely for fallback candidate vote totals", () => {
    expect(
      sumCandidateVoterBalances([
        { balanceOfVoter: "100000" },
        { balanceOfVoter: "4097" },
        { balanceOfVoter: "0" },
        { balanceOfVoter: "40" },
      ])
    ).toBe("104137");
  });
});
