import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Source-invariant guard for the multisig PATCH field lockdown.
//
// `params` holds committee_pubkeys + unsigned_tx, which governanceSignature.js
// trusts to derive the canonical committee. These fields must be rejected, the
// remaining mutable fields must be shape-validated, and the caller must prove
// signer control with a Neo message signature over the exact mutation payload.
const handlerPath = path.resolve(process.cwd(), "api/multisig/requests/[id].js");
const handlerSource = fs.readFileSync(handlerPath, "utf8");

describe("multisig PATCH field lockdown", () => {
  it("rejects mutation of params / unsigned_tx / creator_address", () => {
    expect(handlerSource).toMatch(
      /body\.params\s*!==\s*undefined\s*\|\|\s*body\.unsigned_tx\s*!==\s*undefined\s*\|\|\s*body\.creator_address\s*!==\s*undefined/,
    );
    expect(handlerSource).toMatch(/immutable after creation/);
  });

  it("no longer writes params from the PATCH body", () => {
    // The old code did `JSON.stringify(body.params)` into a `params = $n` set.
    expect(handlerSource).not.toMatch(/JSON\.stringify\(body\.params\)/);
  });

  it("shape-validates broadcast_tx_hash and status before persisting", () => {
    expect(handlerSource).toMatch(/\^0x\[0-9a-f\]\{64\}\$/i);
    expect(handlerSource).toMatch(/Invalid status value/);
  });

  it("requires a signed mutation message and server-resolved committee membership", () => {
    expect(handlerSource).toMatch(/verifyMultisigMutationAuthorization/);
    expect(handlerSource).toMatch(/buildMultisigMutationMessage/);
    expect(handlerSource).toMatch(/mutation_signature/);
    expect(handlerSource).not.toMatch(/deriveCommitteeAddresses/);
    expect(handlerSource).not.toMatch(/requireCommitteeSigner/);
    expect(handlerSource).toMatch(/resolveCommitteePubkeys/);
  });

  it("enforces replay protection: signature freshness + single-use", () => {
    // A fresh client timestamp is part of the signed payload and bounded server-side.
    expect(handlerSource).toMatch(/mutation_signed_at/);
    expect(handlerSource).toMatch(/MUTATION_FRESHNESS_MS/);
    // Each accepted signature is recorded single-use; a replay is a 409.
    expect(handlerSource).toMatch(/multisig_mutation_used/);
    expect(handlerSource).toMatch(/ON CONFLICT \(request_id, signature\) DO NOTHING/);
    expect(handlerSource).toMatch(/replay rejected/i);
  });
});
