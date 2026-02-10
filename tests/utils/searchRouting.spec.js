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
});
