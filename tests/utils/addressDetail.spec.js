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
import { NEO_HASH, GAS_HASH } from "../../src/constants";

describe("addressDetail utils", () => {
  it("returns standard address detail tabs", () => {
    expect(getAddressDetailTabs()).toEqual([
      { key: "transactions", labelKey: "addressDetail.tabTransactions" },
      { key: "tokenTransfers", labelKey: "addressDetail.tabTokenTransfers" },
      { key: "nftTransfers", labelKey: "addressDetail.tabNftTransfers" },
      { key: "tokens", labelKey: "addressDetail.tabTokens" },
      { key: "nfts", labelKey: "addressDetail.tabNfts" },
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

  it("prefers authoritative on-chain asset balances over over-counted account fields", () => {
    // The legacy/indexer path over-counts GAS (it sums NEP17 Transfer
    // events but system-fee burns are not Transfer events). The on-chain
    // getnep17balances result (carried in `assets`) is authoritative and
    // must win for NEO/GAS even when account.* carries a different value.
    expect(
      normalizeAccountSummary(
        { neo: "9", gas: "65671.314", txcount: 11 },
        [
          { asset: NEO_HASH, balance: "0" },
          { asset: GAS_HASH, balance: "65560.87916126" },
        ]
      )
    ).toEqual({
      neoBalance: "0",
      gasBalance: "65560.87916126",
      txCount: 11,
      tokenCount: 2,
    });
  });

  it("falls back to account balances when the asset is absent on-chain", () => {
    expect(
      normalizeAccountSummary({ neo: "12.5", gas: "4.2" }, []).gasBalance
    ).toBe("4.2");
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
        receiver: "NtoAddress",
        method: "GasToken: transfer",
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
        to: "NtoAddress",
        method: "GasToken: transfer",
        vmstate: "HALT",
        size: 244,
        netfee: 0,
        sysfee: 0,
        script: "",
        value: 0,
        notifications: [],
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
