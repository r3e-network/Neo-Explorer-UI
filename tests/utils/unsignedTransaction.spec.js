import { beforeAll, describe, expect, it } from "vitest";
import { decodeUnsignedTransaction, ensureNeonJs, extractScriptBase64FromUnsignedTx } from "@/utils/unsignedTransaction";

beforeAll(async () => { await ensureNeonJs(); });

describe("extractScriptBase64FromUnsignedTx", () => {
  it("extracts the transaction script as base64 from unsigned tx hex", () => {
    const unsignedTx =
      "007e5263f000e1f505000000000065cd1d00000000ad84dd0001aa72bef4c00356e5a63303e3f475789b1ef1f87b80003001e80311c01f0c0d736574466565506572427974650c147bc681c0a1f71d543457b68bba8d5f9fdd4e5ecc41627d5b52";

    expect(extractScriptBase64FromUnsignedTx(unsignedTx)).toBe(
      "AegDEcAfDA1zZXRGZWVQZXJCeXRlDBR7xoHAofcdVDRXtou6jV+f3U5ezEFifVtS",
    );
  });

  it("returns an empty string for invalid tx hex", () => {
    expect(extractScriptBase64FromUnsignedTx("not-hex")).toBe("");
  });

  it("decodes the unsigned transaction envelope and embedded execution script", () => {
    const unsignedTx =
      "003597616f2810020000000000aa000b00000000002f2b8a0001862bce11c9003401ccd69825229e6821e6cfef2880006d01b80b11c01b0c177365744d696c6c697365636f6e6473506572426c6f636b0c147bc681c0a1f71d543457b68bba8d5f9fdd4e5ecc41627d5b520200e1f50511c0130c0e736574476173506572426c6f636b0c14f563ea40bc283d4d0e05c48ea305b3f2a07340ef41627d5b52";

    expect(decodeUnsignedTransaction(unsignedTx)).toEqual(
      expect.objectContaining({
        rawHex: unsignedTx,
        hash: "abfbffc25e0be492095991f1a6fb074df0363e2963b0aace0ee9dd0ebd760765",
        version: 0,
        nonce: 1868666677,
        systemFee: "135208",
        networkFee: "721066",
        totalFee: "856274",
        validUntilBlock: 9055023,
        attributesCount: 0,
        scriptHex:
          "01b80b11c01b0c177365744d696c6c697365636f6e6473506572426c6f636b0c147bc681c0a1f71d543457b68bba8d5f9fdd4e5ecc41627d5b520200e1f50511c0130c0e736574476173506572426c6f636b0c14f563ea40bc283d4d0e05c48ea305b3f2a07340ef41627d5b52",
        scriptLength: 109,
        signers: [
          expect.objectContaining({
            accountScriptHash: "28efcfe621689e222598d6cc013400c911ce2b86",
            scopes: 128,
            scopeLabels: ["Global"],
          }),
        ],
      }),
    );
  });
});
