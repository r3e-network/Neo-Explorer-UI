import { describe, it, expect } from "vitest";
import { resolveNlIntent } from "@/utils/nlIntent";

const BRIDGE = "0x1212000000000000000000000000000000000004";
const TREASURY = "0x1212000000000000000000000000000000000006";
// First registry address mapped to "Neo Foundation (Da Hongfei)".
const DA_HONGFEI = "NgebdUkFxSbzLMruXopuBw4aKsXX8sTyxw";

describe("resolveNlIntent", () => {
  describe("Strategy 1 — entity name -> address route", () => {
    it("resolves the Neo X bridge alias (en + zh) to the TokenBridge address", () => {
      expect(resolveNlIntent("bridge", { chain: "neox" })).toEqual({ path: `/x/address/${BRIDGE}` });
      expect(resolveNlIntent("跨链桥", { chain: "neox" })).toEqual({ path: `/x/address/${BRIDGE}` });
    });

    it("resolves the Neo X treasury entity (en + zh)", () => {
      expect(resolveNlIntent("treasury", { chain: "neox" })).toEqual({ path: `/x/address/${TREASURY}` });
      expect(resolveNlIntent("国库", { chain: "neox" })).toEqual({ path: `/x/address/${TREASURY}` });
    });

    it("prefers the longest alias so 'bridge management' is not the TokenBridge", () => {
      const hit = resolveNlIntent("bridge management", { chain: "neox" });
      expect(hit).not.toEqual({ path: `/x/address/${BRIDGE}` });
      expect(hit.path).toMatch(/^\/x\/address\/0x1212000000000000000000000000000000000005$/);
    });

    it("resolves an N3 known-address alias to the account profile", () => {
      expect(resolveNlIntent("da hongfei", { chain: "n3" })).toEqual({
        path: `/account-profile/${DA_HONGFEI}`,
      });
    });

    it("resolves an N3 generic registry name (Flamingo) to its account", () => {
      const hit = resolveNlIntent("flamingo", { chain: "n3" });
      expect(hit).toEqual({ path: "/account-profile/NhUHywGfUYevMjtbpRDDgGBgkwzYiGD9W9" });
    });
  });

  describe("Strategy 2 — intent keyword -> page route", () => {
    it("routes latest-blocks per chain", () => {
      expect(resolveNlIntent("最新区块", { chain: "n3" })).toEqual({ path: "/blocks/1" });
      expect(resolveNlIntent("最新区块", { chain: "neox" })).toEqual({ path: "/x/blocks" });
      expect(resolveNlIntent("latest blocks", { chain: "neox" })).toEqual({ path: "/x/blocks" });
    });

    it("routes richest accounts on Neo X", () => {
      expect(resolveNlIntent("richest accounts", { chain: "neox" })).toEqual({ path: "/x/accounts" });
    });

    it("routes gas price to the N3 gas tracker", () => {
      expect(resolveNlIntent("gas price", { chain: "n3" })).toEqual({ path: "/gas-tracker" });
    });

    it("routes anti-mev to the Neo X page", () => {
      expect(resolveNlIntent("anti-mev", { chain: "neox" })).toEqual({ path: "/x/anti-mev" });
    });

    it("defaults to n3 chain when no options are given", () => {
      expect(resolveNlIntent("latest transactions")).toEqual({ path: "/transactions/1" });
    });
  });

  describe("chain fallback rules", () => {
    it("falls back to the Neo X anti-mev page for an N3 anti-mev query", () => {
      // Anti-MEV is a Neo X-only concept, so the intent is flagged cross-chain.
      expect(resolveNlIntent("mev", { chain: "n3" })).toEqual({ path: "/x/anti-mev" });
    });

    it("does not cross-fall back for a chain-specific intent without the flag", () => {
      // Burn is N3-only and not flagged for cross fallback.
      expect(resolveNlIntent("burned gas", { chain: "neox" })).toBeNull();
    });

    it("keeps the N3 gas tracker on N3 while Neo X uses charts", () => {
      expect(resolveNlIntent("gas tracker", { chain: "neox" })).toEqual({ path: "/x/charts" });
    });
  });

  describe("null — regex classifier owns identifiers, prose is unmappable", () => {
    it("returns null for empty / whitespace input", () => {
      expect(resolveNlIntent("", { chain: "n3" })).toBeNull();
      expect(resolveNlIntent("   ", { chain: "neox" })).toBeNull();
    });

    it("returns null for a 0x tx/contract hash", () => {
      expect(
        resolveNlIntent("0x8c0671853f4f91d4e8f6f6bb9f7bd20dca71ce7b8776c72f938f742f47ad4e45", { chain: "neox" })
      ).toBeNull();
      expect(resolveNlIntent("0xd2a4cff31913016155e38e474a2c06d08be276cf", { chain: "neox" })).toBeNull();
    });

    it("returns null for a bare block height", () => {
      expect(resolveNlIntent("123456", { chain: "n3" })).toBeNull();
    });

    it("returns null for an N3 base58 address", () => {
      expect(resolveNlIntent("NZ6bKQGT6mWqbXRNjX9ohAr5fVZwifWtGW", { chain: "n3" })).toBeNull();
    });

    it("returns null for a .neo NNS domain", () => {
      expect(resolveNlIntent("neo3.neo", { chain: "n3" })).toBeNull();
    });

    it("returns null for un-mappable prose", () => {
      expect(resolveNlIntent("hello world", { chain: "n3" })).toBeNull();
      expect(resolveNlIntent("hello world", { chain: "neox" })).toBeNull();
    });
  });
});
