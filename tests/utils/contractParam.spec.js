import { buildContractParam } from "@/utils/contractParam";

const { normalizeHash160Mock } = vi.hoisted(() => ({
  normalizeHash160Mock: vi.fn((v) => `normalized:${v}`),
}));

vi.mock("@/utils/walletNormalization", () => ({
  normalizeHash160: normalizeHash160Mock,
}));

describe("buildContractParam", () => {
  beforeEach(() => {
    normalizeHash160Mock.mockReset().mockImplementation((v) => `normalized:${v}`);
  });

  describe("type normalization", () => {
    it("normalizes lowercase 'integer' to 'Integer'", () => {
      const result = buildContractParam("integer", "42");
      expect(result.type).toBe("Integer");
    });

    it("normalizes 'bytestring' to 'ByteArray'", () => {
      const result = buildContractParam("bytestring", "deadbeef");
      expect(result.type).toBe("ByteArray");
    });

    it("defaults to 'String' for empty type", () => {
      const result = buildContractParam("", "hello");
      expect(result.type).toBe("String");
    });

    it("preserves unrecognized types as-is (passes through to scalar check)", () => {
      // Unknown type that isn't in SCALAR_TYPES throws
      expect(() => buildContractParam("CustomType", "x")).toThrow(/Unsupported.*CustomType/);
    });
  });

  describe("Array type", () => {
    it("parses a JSON array of strings", () => {
      const result = buildContractParam("Array", '["a","b","c"]');
      expect(result.type).toBe("Array");
      expect(result.value).toEqual([
        { type: "String", value: "a" },
        { type: "String", value: "b" },
        { type: "String", value: "c" },
      ]);
    });

    it("infers Boolean and Integer from array elements", () => {
      const result = buildContractParam("Array", "[true, 42, \"x\"]");
      expect(result.value).toEqual([
        { type: "Boolean", value: true },
        { type: "Integer", value: "42" },
        { type: "String", value: "x" },
      ]);
    });

    it("throws when JSON is not an array", () => {
      expect(() => buildContractParam("Array", '{"a":1}')).toThrow(/Invalid Array.*JSON array/);
    });

    it("throws on malformed JSON", () => {
      expect(() => buildContractParam("Array", "not json")).toThrow(/Invalid Array/);
    });
  });

  describe("Map type", () => {
    it("converts an object to map entries with String keys", () => {
      const result = buildContractParam("Map", '{"foo":"bar","n":1}');
      expect(result.type).toBe("Map");
      expect(result.value).toEqual([
        { key: { type: "String", value: "foo" }, value: { type: "String", value: "bar" } },
        { key: { type: "String", value: "n" }, value: { type: "Integer", value: "1" } },
      ]);
    });

    it("accepts an array of {key, value} entries", () => {
      const result = buildContractParam(
        "Map",
        '[{"key":"a","value":"b"},{"key":1,"value":2}]'
      );
      expect(result.value).toEqual([
        { key: { type: "String", value: "a" }, value: { type: "String", value: "b" } },
        { key: { type: "Integer", value: "1" }, value: { type: "Integer", value: "2" } },
      ]);
    });

    it("throws when array entry lacks key/value shape", () => {
      expect(() => buildContractParam("Map", '[{"foo":"bar"}]')).toThrow(/array of.*key.*value/i);
    });

    it("throws when JSON is not object or array", () => {
      expect(() => buildContractParam("Map", '"just a string"')).toThrow(/Invalid Map/);
    });
  });

  describe("Any type", () => {
    it("returns { type: 'Any' } regardless of value", () => {
      expect(buildContractParam("Any", "ignored")).toEqual({ type: "Any" });
      expect(buildContractParam("any", null)).toEqual({ type: "Any" });
    });
  });

  describe("Boolean type", () => {
    it("accepts 'true' and 'TRUE'", () => {
      expect(buildContractParam("Boolean", "true")).toEqual({ type: "Boolean", value: true });
      expect(buildContractParam("Boolean", "TRUE")).toEqual({ type: "Boolean", value: true });
    });

    it("accepts '1' as true", () => {
      expect(buildContractParam("Boolean", "1")).toEqual({ type: "Boolean", value: true });
    });

    it("accepts 'false' and '0' as false", () => {
      expect(buildContractParam("Boolean", "false")).toEqual({ type: "Boolean", value: false });
      expect(buildContractParam("Boolean", "0")).toEqual({ type: "Boolean", value: false });
    });

    it("throws on invalid boolean values", () => {
      expect(() => buildContractParam("Boolean", "yes")).toThrow(/true\/false\/1\/0/);
      expect(() => buildContractParam("Boolean", "")).toThrow(/true\/false\/1\/0/);
    });
  });

  describe("Integer type", () => {
    it("accepts positive integers as strings", () => {
      expect(buildContractParam("Integer", "42")).toEqual({ type: "Integer", value: "42" });
    });

    it("accepts negative integers", () => {
      expect(buildContractParam("Integer", "-100")).toEqual({ type: "Integer", value: "-100" });
    });

    it("accepts numeric input via String coercion", () => {
      expect(buildContractParam("Integer", 42)).toEqual({ type: "Integer", value: "42" });
    });

    it("trims surrounding whitespace", () => {
      expect(buildContractParam("Integer", "  42  ")).toEqual({ type: "Integer", value: "42" });
    });

    it("throws on decimal numbers", () => {
      expect(() => buildContractParam("Integer", "1.5")).toThrow(/whole number/);
    });

    it("throws on non-numeric input", () => {
      expect(() => buildContractParam("Integer", "abc")).toThrow(/whole number/);
    });

    it("throws on empty/null input", () => {
      expect(() => buildContractParam("Integer", "")).toThrow(/whole number/);
      expect(() => buildContractParam("Integer", null)).toThrow(/whole number/);
    });
  });

  describe("Hash160 type", () => {
    it("calls normalizeHash160 for non-empty values", () => {
      const result = buildContractParam("Hash160", "NAddress123");
      expect(normalizeHash160Mock).toHaveBeenCalledWith("NAddress123");
      expect(result).toEqual({ type: "Hash160", value: "normalized:NAddress123" });
    });

    it("returns empty value without calling normalize when input is empty", () => {
      const result = buildContractParam("Hash160", "");
      expect(normalizeHash160Mock).not.toHaveBeenCalled();
      expect(result).toEqual({ type: "Hash160", value: "" });
    });

    it("returns empty value when input is null/undefined", () => {
      expect(buildContractParam("Hash160", null)).toEqual({ type: "Hash160", value: "" });
      expect(buildContractParam("Hash160", undefined)).toEqual({ type: "Hash160", value: "" });
    });
  });

  describe("Other scalar types", () => {
    it("handles String", () => {
      expect(buildContractParam("String", "hello")).toEqual({ type: "String", value: "hello" });
    });

    it("handles Hash256", () => {
      expect(buildContractParam("Hash256", "0xabc")).toEqual({ type: "Hash256", value: "0xabc" });
    });

    it("handles ByteArray", () => {
      expect(buildContractParam("ByteArray", "deadbeef")).toEqual({ type: "ByteArray", value: "deadbeef" });
    });

    it("handles PublicKey", () => {
      expect(buildContractParam("PublicKey", "0x03abc")).toEqual({ type: "PublicKey", value: "0x03abc" });
    });

    it("handles Signature", () => {
      expect(buildContractParam("Signature", "sig")).toEqual({ type: "Signature", value: "sig" });
    });

    it("converts null/undefined values to empty string for non-Hash160 scalars", () => {
      expect(buildContractParam("String", null)).toEqual({ type: "String", value: "" });
      expect(buildContractParam("String", undefined)).toEqual({ type: "String", value: "" });
    });
  });

  describe("Error paths", () => {
    it("throws on completely unsupported type", () => {
      expect(() => buildContractParam("Quaternion", "x")).toThrow(/Unsupported.*Quaternion/);
    });
  });
});
