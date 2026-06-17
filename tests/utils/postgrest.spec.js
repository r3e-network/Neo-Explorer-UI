import { describe, expect, it } from "vitest";
import {
  clampLimit,
  clampOffset,
  eqHash,
  inAddresses,
  inHashes,
  safeAddress,
  safeHash,
  safeTokenId,
} from "@/utils/postgrest";

describe("postgrest helpers", () => {
  describe("safeHash", () => {
    it("accepts and normalizes a 40-hex hash", () => {
      expect(safeHash("ef4073a0f2b305a38ec4050e4d3d28bc40ea63f5")).toBe("0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5");
      expect(safeHash("0xEF4073A0F2B305A38EC4050E4D3D28BC40EA63F5")).toBe("0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5");
    });
    it("accepts a 64-hex txid", () => {
      expect(safeHash("0x" + "ab".repeat(32))).toBe("0x" + "ab".repeat(32));
    });
    it("rejects non-hex / wrong-length / DSL-injected values", () => {
      expect(safeHash("not-a-hash")).toBe("");
      expect(safeHash("0x1234")).toBe("");
      expect(safeHash("0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5),limit=1")).toBe("");
    });
  });

  describe("safeAddress", () => {
    it("accepts a Neo N3 base58 address", () => {
      expect(safeAddress("NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp")).toBe("NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp");
    });
    it("rejects non-address strings", () => {
      expect(safeAddress("0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5")).toBe("");
      expect(safeAddress("NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp),evil")).toBe("");
    });
  });

  describe("eqHash", () => {
    it("builds an eq.<hash> predicate for valid hashes", () => {
      expect(eqHash("0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5")).toBe("eq.0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5");
    });
    it("returns empty string for invalid hashes (caller can skip the query)", () => {
      expect(eqHash("evil),limit=1")).toBe("");
      expect(eqHash("")).toBe("");
    });
  });

  describe("inHashes", () => {
    it("builds an in.(...) predicate from a list of valid hashes", () => {
      const h = "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5";
      expect(inHashes([h, "0x" + "ab".repeat(32)])).toBe(
        `in.(${h},0x${"ab".repeat(32)})`,
      );
    });
    it("drops invalid items so a crafted item cannot smuggle a predicate", () => {
      const good = "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5";
      expect(inHashes([good, "evil),limit=1", "0x1234"])).toBe(`in.(${good})`);
    });
    it("returns empty when no items are valid", () => {
      expect(inHashes(["evil", "0x1234"])).toBe("");
      expect(inHashes([])).toBe("");
    });
  });

  describe("inAddresses", () => {
    it("drops invalid addresses", () => {
      const a = "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp";
      expect(inAddresses([a, "0xnotanaddress"])).toBe(`in.(${a})`);
    });
  });

  describe("safeTokenId", () => {
    it("accepts a clean token id", () => {
      expect(safeTokenId("mytoken-123")).toBe("mytoken-123");
    });
    it("rejects token ids with PostgREST-DSL metacharacters", () => {
      expect(safeTokenId("a),limit=1")).toBe("");
      expect(safeTokenId('a"b')).toBe("");
      expect(safeTokenId("a,b")).toBe("");
    });
  });

  describe("clampLimit / clampOffset", () => {
    it("clamps limit to the configured maximum", () => {
      expect(clampLimit(100000, 20, 200)).toBe(200);
      expect(clampLimit(50, 20, 200)).toBe(50);
      expect(clampLimit(0, 20, 200)).toBe(20);
      expect(clampLimit(-5, 20, 200)).toBe(20);
      expect(clampLimit("abc", 20, 200)).toBe(20);
    });
    it("clamps offset to non-negative", () => {
      expect(clampOffset(-1)).toBe(0);
      expect(clampOffset(50)).toBe(50);
      expect(clampOffset("abc")).toBe(0);
      expect(clampOffset(9_999_999, 1_000_000)).toBe(1_000_000);
    });
  });
});
