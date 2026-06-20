import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Source-invariant guard for the multisig PATCH field lockdown.
//
// `params` holds committee_pubkeys + unsigned_tx, which governanceSignature.js
// trusts to derive the canonical committee. The PATCH endpoint authorizes by a
// self-asserted `signer_address` (no cryptographic proof), so allowing `params`
// / `unsigned_tx` mutation through it would let any logged-in visitor rewrite
// the committee set or the transaction being signed (privilege escalation).
// These fields must be rejected, and the remaining mutable fields must be
// shape-validated.
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

  it("still gates on creator or server-resolved committee membership", () => {
    expect(handlerSource).toMatch(/isCreatorForProposal/);
    expect(handlerSource).toMatch(/requireCommitteeSigner/);
    expect(handlerSource).toMatch(/resolveCommitteePubkeys/);
  });
});
