/**
 * Governance native-contract invocation targets (Neo N3).
 *
 * Single source of truth for the label -> script-hash map used by the
 * governance create/sign/detail flows (GovernanceCreateModal, GovernanceTool,
 * GovernanceProposalDetail).
 *
 * IMPORTANT: values are BARE lowercase script hashes (no 0x prefix).
 * GovernanceCreateModal sends them verbatim as `targetHash` to the backend,
 * so do NOT replace them with the 0x-prefixed keys of NATIVE_CONTRACTS in
 * src/constants/index.js.
 */
export const GOVERNANCE_INVOCATION_TARGETS = Object.freeze({
  PolicyContract: "cc5e4edd9f5f8dba8bb65734541df7a1c081c67b",
  RoleManagement: "49cf4e5378ffcd4dec034fd98a174c5491e395e2",
  OracleContract: "fe924b7cfe89ddd271abaf7210a80a7e11178758",
  NEO: "ef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
});

/**
 * Derived hash -> label lookup (keys are bare lowercase hex, matching the
 * values above). Replaces the per-component Object.fromEntries derivations.
 */
export const GOVERNANCE_CONTRACT_LABELS_BY_HASH = Object.freeze(
  Object.fromEntries(
    Object.entries(GOVERNANCE_INVOCATION_TARGETS).map(([label, hash]) => [hash.toLowerCase(), label]),
  ),
);
