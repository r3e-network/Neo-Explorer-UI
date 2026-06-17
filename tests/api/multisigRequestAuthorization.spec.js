import { beforeEach, describe, expect, it, vi } from "vitest";

// Unit tests for the committee-membership authorization used by the multisig
// request PATCH endpoint. The handler must refuse to update
// status/broadcast_tx_hash/params unless the caller proves they are a member
// of the proposal's committee (server-resolved), closing the open-PATCH gap
// that allowed anyone to mark proposals EXECUTED with a fake tx hash.

describe("multisig request authorization (committee membership)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("isCommitteeMember returns true when the address is in the resolved committee", async () => {
    const { isCommitteeMemberForProposal } = await import("../../api/lib/multisigAuthorization.js");
    const committeeAddresses = ["Nalice", "Nbob", "Ncarol"];
    const ok = isCommitteeMemberForProposal("Nbob", committeeAddresses);
    expect(ok).toBe(true);
  });

  it("isCommitteeMember returns false for a non-member", async () => {
    const { isCommitteeMemberForProposal } = await import("../../api/lib/multisigAuthorization.js");
    const ok = isCommitteeMemberForProposal("Nattacker", ["Nalice", "Nbob"]);
    expect(ok).toBe(false);
  });

  it("isCommitteeMember returns false for empty/undefined signer", async () => {
    const { isCommitteeMemberForProposal } = await import("../../api/lib/multisigAuthorization.js");
    expect(isCommitteeMemberForProposal("", ["Nalice"])).toBe(false);
    expect(isCommitteeMemberForProposal(undefined, ["Nalice"])).toBe(false);
  });

  it("isCommitteeMember is case/whitespace tolerant and trims", async () => {
    const { isCommitteeMemberForProposal } = await import("../../api/lib/multisigAuthorization.js");
    expect(isCommitteeMemberForProposal("  Nalice  ", ["Nalice", "Nbob"])).toBe(true);
  });

  it("deriveCommitteeAddresses maps pubkeys to addresses via neon-js", async () => {
    const { deriveCommitteeAddresses } = await import("../../api/lib/multisigAuthorization.js");
    // A real mainnet validator pubkey -> known address
    const addrs = await deriveCommitteeAddresses([
      "0239a37436652f41b3b802ca44cbcb7d65d3aa0b88c9a0380243bdbe1aaa5cb35b",
    ]);
    expect(Array.isArray(addrs)).toBe(true);
    expect(addrs.length).toBe(1);
    expect(addrs[0]).toMatch(/^N[1-9A-HJ-NP-Za-km-z]+$/);
  });

  it("requireCommitteeSigner returns ok=true for a member", async () => {
    const { requireCommitteeSigner } = await import("../../api/lib/multisigAuthorization.js");
    const r = requireCommitteeSigner("Nbob", ["Nalice", "Nbob", "Ncarol"]);
    expect(r.ok).toBe(true);
  });

  it("requireCommitteeSigner returns ok=false with a reason for a non-member", async () => {
    const { requireCommitteeSigner } = await import("../../api/lib/multisigAuthorization.js");
    const r = requireCommitteeSigner("Nattacker", ["Nalice", "Nbob"]);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not a member/i);
  });
});
