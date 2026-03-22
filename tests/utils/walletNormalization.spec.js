import { describe, expect, it } from "vitest";
import {
  isHash160Hex,
  normalizeHash160,
  normalizeSignMessageResult,
} from "@/utils/walletNormalization";

describe("wallet normalization helpers", () => {
  it("normalizes hash160 values from 0x-prefixed input", () => {
    expect(normalizeHash160("0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5")).toBe(
      "ef4073a0f2b305a38ec4050e4d3d28bc40ea63f5"
    );
  });

  it("normalizes hash160 values from N3 address input", () => {
    expect(normalizeHash160("Nj39M97Rk2e23JiULBBMQmvpcnKaRHqxFf")).toBe(
      "a62eb3c767ef3d39d98c704f70fc4e869349a6fd"
    );
  });

  it("keeps invalid hash160 input unchanged", () => {
    expect(normalizeHash160("not-a-hash")).toBe("not-a-hash");
  });

  it("detects valid hash160 hex strings", () => {
    expect(isHash160Hex("a62eb3c767ef3d39d98c704f70fc4e869349a6fd")).toBe(true);
    expect(isHash160Hex("0xa62eb3c767ef3d39d98c704f70fc4e869349a6fd")).toBe(true);
    expect(isHash160Hex("Nj39M97Rk2e23JiULBBMQmvpcnKaRHqxFf")).toBe(false);
  });

  it("normalizes signMessage result with data field into signature field", () => {
    const normalized = normalizeSignMessageResult({ data: "0xsig", publicKey: "03abc" });
    expect(normalized).toEqual({
      data: "0xsig",
      publicKey: "03abc",
      signature: "0xsig",
    });
  });

  it("normalizes string signMessage result into object shape", () => {
    const normalized = normalizeSignMessageResult("0xrawsig");
    expect(normalized).toEqual({
      data: "0xrawsig",
      signature: "0xrawsig",
    });
  });
});
