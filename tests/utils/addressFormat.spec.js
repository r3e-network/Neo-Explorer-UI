import { truncateHash, isValidNeoAddress, isValidTxHash, isValidBlockHash } from "@/utils/addressFormat";

describe("truncateHash", () => {
  it("truncates a long hash with default params", () => {
    const hash = "0x1234567890abcdef1234567890abcdef12345678";
    expect(truncateHash(hash)).toBe("0x123456...345678");
  });

  it("returns full value when shorter than start + end + 3", () => {
    expect(truncateHash("0x1234abcd")).toBe("0x1234abcd");
  });

  it("respects custom start/end lengths", () => {
    const hash = "0xaabbccddeeff00112233445566778899aabbccdd";
    expect(truncateHash(hash, 4, 4)).toBe("0xaa...ccdd");
  });

  it("returns empty string for null/undefined/empty", () => {
    expect(truncateHash(null)).toBe("");
    expect(truncateHash(undefined)).toBe("");
    expect(truncateHash("")).toBe("");
  });
});

describe("isValidNeoAddress", () => {
  it("accepts a valid Neo N3 address", () => {
    // 'N' + 33 base58 chars (no 0, O, I, l)
    expect(isValidNeoAddress("NNLi44dJNXtDNSBkofB48aTVYtb1zZrNEs")).toBe(true);
  });

  it("rejects address not starting with N", () => {
    expect(isValidNeoAddress("ALi44dJNXtDNSBkofB48aTVYtb1zZrNEs")).toBe(false);
  });

  it("rejects address with wrong length", () => {
    expect(isValidNeoAddress("NNLi44dJNXtDNSBkofB48aTVYtb1zZr")).toBe(false);
    expect(isValidNeoAddress("NNLi44dJNXtDNSBkofB48aTVYtb1zZrNEsXX")).toBe(false);
  });

  it("rejects address with invalid base58 chars (0, O, I, l)", () => {
    // Replace valid char with '0' (not in base58)
    expect(isValidNeoAddress("N0Li44dJNXtDNSBkofB48aTVYtb1zZrNEs")).toBe(false);
    expect(isValidNeoAddress("NOLi44dJNXtDNSBkofB48aTVYtb1zZrNEs")).toBe(false);
    expect(isValidNeoAddress("NILi44dJNXtDNSBkofB48aTVYtb1zZrNEs")).toBe(false);
    expect(isValidNeoAddress("NlLi44dJNXtDNSBkofB48aTVYtb1zZrNEs")).toBe(false);
  });

  it("returns false for null/undefined/non-string", () => {
    expect(isValidNeoAddress(null)).toBe(false);
    expect(isValidNeoAddress(undefined)).toBe(false);
    expect(isValidNeoAddress(12345)).toBe(false);
    expect(isValidNeoAddress("")).toBe(false);
  });
});

describe("isValidTxHash", () => {
  it("accepts a valid 0x-prefixed 64-char hex hash", () => {
    const hash = "0x" + "a".repeat(64);
    expect(isValidTxHash(hash)).toBe(true);
  });

  it("accepts mixed-case hex", () => {
    const hash = "0xAaBbCcDd" + "1234567890abcdef".repeat(3) + "12345678";
    // Ensure exactly 64 hex chars after 0x
    const valid = "0x" + "aAbBcCdD".repeat(8);
    expect(isValidTxHash(valid)).toBe(true);
  });

  it("rejects hash without 0x prefix", () => {
    expect(isValidTxHash("a".repeat(64))).toBe(false);
  });

  it("rejects hash with wrong length", () => {
    expect(isValidTxHash("0x" + "a".repeat(63))).toBe(false);
    expect(isValidTxHash("0x" + "a".repeat(65))).toBe(false);
  });

  it("rejects hash with non-hex characters", () => {
    expect(isValidTxHash("0x" + "g".repeat(64))).toBe(false);
  });

  it("returns false for null/undefined/non-string", () => {
    expect(isValidTxHash(null)).toBe(false);
    expect(isValidTxHash(undefined)).toBe(false);
    expect(isValidTxHash(42)).toBe(false);
    expect(isValidTxHash("")).toBe(false);
  });
});

describe("isValidBlockHash", () => {
  it("delegates to isValidTxHash (same format)", () => {
    const hash = "0x" + "f".repeat(64);
    expect(isValidBlockHash(hash)).toBe(true);
    expect(isValidBlockHash("bad")).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isValidBlockHash(null)).toBe(false);
    expect(isValidBlockHash(undefined)).toBe(false);
  });
});
