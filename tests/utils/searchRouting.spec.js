import { describe, it, expect } from "vitest";
import { resolveSearchLocation } from "../../src/utils/searchRouting";

describe("resolveSearchLocation", () => {
  it("returns null for empty query", () => {
    expect(resolveSearchLocation("   ", { type: "address" })).toBeNull();
  });

  it("routes blocks to block detail page", () => {
    expect(
      resolveSearchLocation("0xabc", {
        type: "block",
        data: { hash: "0xblockhash" },
      })
    ).toEqual({ path: "/block-info/0xblockhash" });
  });

  it("routes transactions to transaction detail page", () => {
    expect(
      resolveSearchLocation("0xtx", {
        type: "transaction",
        data: { hash: "0xtxhash" },
      })
    ).toEqual({ path: "/transaction-info/0xtxhash" });
  });

  it("routes contracts to contract detail page", () => {
    expect(
      resolveSearchLocation("0xcontract", {
        type: "contract",
        data: { hash: "0xcontracthash" },
      })
    ).toEqual({ path: "/contract-info/0xcontracthash" });
  });

  it("routes addresses to account profile", () => {
    expect(resolveSearchLocation("Nabc", { type: "address" })).toEqual({
      path: "/account-profile/Nabc",
    });
  });

  it("routes tokens to token detail page", () => {
    expect(
      resolveSearchLocation("0xtoken", {
        type: "token",
        data: { hash: "0xtokenhash" },
      })
    ).toEqual({ path: "/nep17-token-info/0xtokenhash" });
  });

  it("falls back to search results page", () => {
    expect(resolveSearchLocation("something", { type: "unknown" })).toEqual({
      path: "/search",
      query: { q: "something" },
    });
  });

  it("routes numeric query to block detail when backend lookup fails", () => {
    expect(resolveSearchLocation("123456", null)).toEqual({
      path: "/block-info/123456",
    });
  });

  it("routes address query to account profile when backend lookup fails", () => {
    expect(resolveSearchLocation("NZ6bKQGT6mWqbXRNjX9ohAr5fVZwifWtGW", null)).toEqual({
      path: "/account-profile/NZ6bKQGT6mWqbXRNjX9ohAr5fVZwifWtGW",
    });
  });

  it("routes tx hash query to tx detail when backend lookup fails", () => {
    expect(
      resolveSearchLocation("0x8c0671853f4f91d4e8f6f6bb9f7bd20dca71ce7b8776c72f938f742f47ad4e45", null)
    ).toEqual({
      path: "/transaction-info/0x8c0671853f4f91d4e8f6f6bb9f7bd20dca71ce7b8776c72f938f742f47ad4e45",
    });
  });

  it("routes 40-char contract hash query to contract detail when backend lookup fails", () => {
    expect(resolveSearchLocation("0xd2a4cff31913016155e38e474a2c06d08be276cf", null)).toEqual({
      path: "/contract-info/0xd2a4cff31913016155e38e474a2c06d08be276cf",
    });
  });

  it("routes NNS domain query to account profile when backend lookup fails", () => {
    expect(resolveSearchLocation("neo3.neo", null)).toEqual({
      path: "/account-profile/neo3.neo",
    });
  });
});
