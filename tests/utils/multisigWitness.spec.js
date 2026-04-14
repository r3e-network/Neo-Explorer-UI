import { describe, expect, it } from "vitest";

import {
  buildExternalWitnessPayload,
  buildSignatureInvocationScriptBase64,
  buildSignatureInvocationScriptHex,
  decodeSingleSignatureFromInvocationScript,
  resolveWitnessSignerAddress,
} from "../../src/utils/multisigWitness.js";

describe("multisigWitness helpers", () => {
  const signatureHex = "ab".repeat(64);
  const invocationScriptHex = `0c40${signatureHex}`;
  const signerPublicKey = "03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5";

  it("decodes a single pushed signature from invocation script hex", () => {
    expect(decodeSingleSignatureFromInvocationScript(invocationScriptHex)).toBe(signatureHex);
  });

  it("builds a pushdata invocation script from signature hex", () => {
    expect(buildSignatureInvocationScriptHex(signatureHex)).toBe(invocationScriptHex);
    expect(buildSignatureInvocationScriptBase64(signatureHex)).toBeTruthy();
  });

  it("derives signer address from public key when address is missing", () => {
    const result = resolveWitnessSignerAddress({ signerPublicKey });
    expect(result.signerAddress).toMatch(/^N/);
    expect(result.signerPublicKey).toBe(signerPublicKey);
  });

  it("builds external witness payload from invocation script only", () => {
    const signer = resolveWitnessSignerAddress({ signerPublicKey });
    const payload = buildExternalWitnessPayload({
      signerPublicKey,
      invocationScript: invocationScriptHex,
      eligibleSigners: [signer.signerAddress],
    });

    expect(payload.signerAddress).toBe(signer.signerAddress);
    expect(payload.signature).toBe(signatureHex);
    expect(payload.invocationScript).toBe(invocationScriptHex);
    expect(payload.witness.source).toBe("external_witness");
  });

  it("builds a signer payload from raw signature and preserves a custom source", () => {
    const signer = resolveWitnessSignerAddress({ signerPublicKey });
    const payload = buildExternalWitnessPayload({
      signerAddress: signer.signerAddress,
      signerPublicKey,
      signatureHex,
      eligibleSigners: [signer.signerAddress],
      source: "wallet_signature",
    });

    expect(payload.signerAddress).toBe(signer.signerAddress);
    expect(payload.publicKey).toBe(signerPublicKey);
    expect(payload.invocationScript).toBe(invocationScriptHex);
    expect(payload.witness.public_key).toBe(signerPublicKey);
    expect(payload.witness.invocation_script).toBe(invocationScriptHex);
    expect(payload.witness.source).toBe("wallet_signature");
  });

  it("rejects witness submissions for non-eligible signers", () => {
    expect(() =>
      buildExternalWitnessPayload({
        signerPublicKey,
        invocationScript: invocationScriptHex,
        eligibleSigners: ["NZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ"],
      })
    ).toThrow(/eligible council signer/);
  });

  it("rejects mismatched signature and invocation script", () => {
    expect(() =>
      buildExternalWitnessPayload({
        signerPublicKey,
        signatureHex: "cd".repeat(64),
        invocationScript: invocationScriptHex,
      })
    ).toThrow(/does not match/);
  });

  it("rejects a mismatched signer address and public key pair", () => {
    expect(() =>
      buildExternalWitnessPayload({
        signerAddress: "NZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ",
        signerPublicKey,
        signatureHex,
      })
    ).toThrow(/does not match the provided public key/);
  });
});
