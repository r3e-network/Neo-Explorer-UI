import { describe, it, expect } from "vitest";
import {
  base64ToHex,
  hexToBase64,
  reverseHex,
  scriptHashBase64ToAddress,
  scriptHashHexToAddress,
} from "../../src/utils/neoHelpers.js";

describe("neoHelpers", () => {
  it("converts script hash hex to Neo N3 address", () => {
    expect(scriptHashHexToAddress("d2a4cff31913016155e38e474a2c06d08be276cf")).toBe("NepwUjd9GhqgNkrfXaxj9mmsFhFzGoFuWM");
    expect(scriptHashHexToAddress("0xd2a4cff31913016155e38e474a2c06d08be276cf")).toBe("NepwUjd9GhqgNkrfXaxj9mmsFhFzGoFuWM");
  });

  it("converts little-endian base64 script hash to address", () => {
    expect(scriptHashBase64ToAddress("z3bii9AGLEpHjuNVYQETGfPPpNI=")).toBe("NepwUjd9GhqgNkrfXaxj9mmsFhFzGoFuWM");
  });

  it("keeps hex/base64 conversions stable", () => {
    const hex = "d2a4cff31913016155e38e474a2c06d08be276cf";
    const base64 = hexToBase64(hex);

    expect(base64).toBe("0qTP8xkTAWFV445HSiwG0Ivids8=");
    expect(base64ToHex(base64)).toBe(hex);
  });

  it("reverses hex pairs safely", () => {
    expect(reverseHex("a1b2c3")).toBe("c3b2a1");
    expect(reverseHex("0xa1b2c3")).toBe("c3b2a1");
    expect(reverseHex("invalid")).toBe("");
  });
});
