// Committee-membership authorization for multisig request mutations.
//
// Background: the multisig PATCH endpoint (/api/multisig/requests/[id]) updates
// status / broadcast_tx_hash / params / metadata on a proposal. After the
// same-origin (CSRF) gate, the remaining gap is that anyone who can reach the
// endpoint same-origin (a logged-in visitor) could overwrite those fields on
// any proposal by id. The correct authorization is: only a member of the
// proposal's committee (or its creator) may mutate its state.
//
// The broadcast flow in the governance views already has the connected wallet
// (a committee member, since they collected the committee signatures). We
// require the caller to send `signer_address`, re-resolve the proposal's
// canonical committee server-side, derive each member's address, and verify
// membership. This matches `verifyGovernanceWitness`'s posture: never trust a
// caller-supplied committee; always re-derive from the canonical pubkey set.

const loadNeon = () => import("@r3e/neo-js-sdk/browser");

function normalizeAddress(value) {
  return String(value || "").trim();
}

/**
 * Derive the Neo N3 addresses for a list of committee public keys.
 * Returns [] on any error so the caller can fail closed.
 */
async function deriveCommitteeAddresses(committeePubkeys) {
  const list = Array.isArray(committeePubkeys) ? committeePubkeys : [];
  if (!list.length) return [];
  const neon = await loadNeon();
  const addresses = [];
  for (const pubkey of list) {
    try {
      const account = new neon.wallet.Account(pubkey);
      const address = String(account.address || "").trim();
      if (address) addresses.push(address);
    } catch {
      // skip malformed pubkey
    }
  }
  return addresses;
}

/**
 * Membership check: is `signerAddress` one of the committee `addresses`?
 * Tolerant of surrounding whitespace.
 */
function isCommitteeMemberForProposal(signerAddress, committeeAddresses) {
  const signer = normalizeAddress(signerAddress);
  if (!signer) return false;
  const list = Array.isArray(committeeAddresses) ? committeeAddresses : [];
  return list.some((addr) => normalizeAddress(addr) === signer);
}

/**
 * Authorize a signer against a committee. Returns { ok, reason }.
 */
function requireCommitteeSigner(signerAddress, committeeAddresses) {
  const signer = normalizeAddress(signerAddress);
  if (!signer) {
    return { ok: false, reason: "Missing signer_address." };
  }
  if (!isCommitteeMemberForProposal(signer, committeeAddresses)) {
    return { ok: false, reason: "Signer is not a member of this proposal's committee." };
  }
  return { ok: true, reason: "" };
}

/**
 * The creator of a proposal is also authorized to mutate it (e.g. to fix
 * metadata before any signatures are collected).
 */
function isCreatorForProposal(signerAddress, creatorAddress) {
  const signer = normalizeAddress(signerAddress);
  const creator = normalizeAddress(creatorAddress);
  return !!signer && !!creator && signer === creator;
}

module.exports = {
  deriveCommitteeAddresses,
  isCommitteeMemberForProposal,
  isCreatorForProposal,
  requireCommitteeSigner,
};
