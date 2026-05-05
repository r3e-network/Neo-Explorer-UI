import { hex2base64, base642hex, BigInteger } from "@/utils/sdkCompat";

describe("hex2base64", () => {
  it("converts simple hex to base64", () => {
    // "Hello" = 48 65 6c 6c 6f hex → "SGVsbG8=" base64
    expect(hex2base64("48656c6c6f")).toBe("SGVsbG8=");
  });

  it("strips 0x prefix", () => {
    expect(hex2base64("0x48656c6c6f")).toBe("SGVsbG8=");
  });

  it("handles uppercase 0X prefix", () => {
    expect(hex2base64("0X48656c6c6f")).toBe("SGVsbG8=");
  });

  it("returns empty base64 for empty input", () => {
    expect(hex2base64("")).toBe("");
  });

  it("returns empty base64 for null/undefined", () => {
    expect(hex2base64(null)).toBe("");
    expect(hex2base64(undefined)).toBe("");
  });

  it("round-trips with base642hex", () => {
    const hex = "deadbeef";
    expect(base642hex(hex2base64(hex))).toBe(hex);
  });
});

describe("base642hex", () => {
  it("converts simple base64 to hex", () => {
    expect(base642hex("SGVsbG8=")).toBe("48656c6c6f");
  });

  it("preserves zero-padding for single-digit bytes", () => {
    // 0x00, 0x0a, 0xff → "AAr/" base64
    expect(base642hex("AAr/")).toBe("000aff");
  });

  it("returns empty hex for empty input", () => {
    expect(base642hex("")).toBe("");
  });
});

describe("BigInteger", () => {
  it("is the native BigInt constructor", () => {
    expect(BigInteger).toBe(BigInt);
  });

  it("can be used to construct BigInts", () => {
    expect(BigInteger(123)).toBe(123n);
    expect(BigInteger("99999999999999999")).toBe(99999999999999999n);
  });
});
