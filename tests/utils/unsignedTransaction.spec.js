import { describe, expect, it } from "vitest";
import { extractScriptBase64FromUnsignedTx } from "@/utils/unsignedTransaction";

describe("extractScriptBase64FromUnsignedTx", () => {
  it("extracts the transaction script as base64 from unsigned tx hex", () => {
    const unsignedTx =
      "007e5263f000e1f505000000000065cd1d00000000ad84dd0001aa72bef4c00356e5a63303e3f475789b1ef1f87b80003001e80311c01f0c0d736574466565506572427974650c147bc681c0a1f71d543457b68bba8d5f9fdd4e5ecc41627d5b52";

    expect(extractScriptBase64FromUnsignedTx(unsignedTx)).toBe(
      "AegDEcAfDA1zZXRGZWVQZXJCeXRlDBR7xoHAofcdVDRXtou6jV+f3U5ezEFifVtS"
    );
  });

  it("returns an empty string for invalid tx hex", () => {
    expect(extractScriptBase64FromUnsignedTx("not-hex")).toBe("");
  });
});
