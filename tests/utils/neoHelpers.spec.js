import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  addressToScriptHash,
  base64ToHex,
  hexToBase64,
  publicKeyToAddress,
  reverseHex,
  scriptHashBase64ToAddress,
  scriptHashHexToAddress,
} from "../../src/utils/neoHelpers.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const neoHelpersSourcePath = path.resolve(currentDir, "../../src/utils/neoHelpers.js");

describe("neoHelpers", () => {
  it("does not statically import neon-js in the shared helper module", () => {
    const source = fs.readFileSync(neoHelpersSourcePath, "utf8");
    expect(source).not.toMatch(/from\s+["']@cityofzion\/neon-js["']/);
  });

  it("converts script hash hex to Neo N3 address", () => {
    expect(scriptHashHexToAddress("d2a4cff31913016155e38e474a2c06d08be276cf")).toBe("NepwUjd9GhqgNkrfXaxj9mmsFhFzGoFuWM");
    expect(scriptHashHexToAddress("0xd2a4cff31913016155e38e474a2c06d08be276cf")).toBe("NepwUjd9GhqgNkrfXaxj9mmsFhFzGoFuWM");
  });

  it("converts Neo N3 address to script hash", () => {
    expect(addressToScriptHash("NZ6bKQGT6mWqbXRNjX9ohAr5fVZwifWtGW")).toBe("0xa8baabcbed1ed250e3d55a5999684a74c5f49b90");
  });

  it("converts compressed public key to address", () => {
    expect(publicKeyToAddress("02d8cd12ea5c67f2f8a00c1124893edcfa6754c4d6cede6be13bdf2295c810a97f")).toBe(
      "NQ41dZqAZnNDbAvt6kP2ZvtJUEr8Xq4DXQ"
    );
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
