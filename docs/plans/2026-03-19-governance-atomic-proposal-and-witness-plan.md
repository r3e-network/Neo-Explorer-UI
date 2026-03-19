# Governance Atomic Proposal And Witness Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish the governance tool so it can author the atomic mainnet proposal for `setMillisecondsPerBlock(3000)` plus `setGasPerBlock(100000000)`, explain the parameter units clearly, and accept imported witness fragments from external council signers.

**Architecture:** Keep the existing governance proposal flow in `GovernanceTool.vue`, but extend the native-method metadata so the UI knows the exact parameters, descriptions, examples, and `callFlags` for each invocation. Reuse the existing Supabase multisig tables and the new `multisigWitness` helper so the detail page and create flow remain compatible with wallet signatures and imported witness scripts.

**Tech Stack:** Vue 3, Vitest, neon-js, Supabase JS.

### Task 1: Lock down missing governance behavior with tests

**Files:**
- Modify: `tests/views/GovernanceToolNetworkChange.spec.js`
- Modify: `tests/views/GovernanceProposalDetail.spec.js`
- Modify: `tests/utils/multisigWitness.spec.js`

**Step 1: Write failing tests**
- Cover the `setMillisecondsPerBlock` method appearing in the governance tool.
- Cover the create flow emitting the exact per-invocation `callFlags` for `setMillisecondsPerBlock` and `setGasPerBlock`.
- Cover the new parameter guidance text for milliseconds and GAS fractions.

**Step 2: Run tests to verify failure**
Run: `npm test -- tests/views/GovernanceToolNetworkChange.spec.js tests/views/GovernanceProposalDetail.spec.js tests/utils/multisigWitness.spec.js`

**Step 3: Implement minimal code**
- Only touch the smallest metadata and template surface needed to satisfy the tests.

**Step 4: Run tests to verify pass**
Run the same command and confirm green.

### Task 2: Finish governance UI support

**Files:**
- Modify: `src/views/Tools/GovernanceTool.vue`
- Modify: `src/views/Tools/GovernanceProposalDetail.vue`
- Create/Modify: `src/utils/multisigWitness.js`

**Step 1: Extend native method metadata**
- Add `PolicyContract.setMillisecondsPerBlock`.
- Add descriptions, placeholders, examples, and exact `callFlags` where needed.

**Step 2: Preserve multi-invocation payload fidelity**
- Ensure the created Neon script receives the correct `callFlags` per invocation.
- Keep the stored `params.invocations` structure usable for detail-page rendering and external witness collection.

**Step 3: Keep witness import behavior consistent**
- Leave duplicate-signer protection in place.
- Preserve imported invocation/verification scripts when storing witness fragments.

**Step 4: Re-run focused tests**
Run: `npm test -- tests/views/GovernanceToolNetworkChange.spec.js tests/views/GovernanceProposalDetail.spec.js tests/utils/multisigWitness.spec.js`

### Task 3: Validate and prepare the live mainnet proposal

**Files:**
- Create or modify a one-off local script under `scripts/` or `/tmp`
- Verify: `src/views/Tools/GovernanceTool.vue`

**Step 1: Re-verify live chain state**
- Confirm mainnet committee membership for the supplied WIF.
- Confirm current block time and gas-per-block values from live RPC.

**Step 2: Build the exact two-invocation transaction**
- Invocation 1: `PolicyContract.setMillisecondsPerBlock(3000)` with `CallFlags.States | CallFlags.AllowNotify`
- Invocation 2: `NEO.setGasPerBlock(100000000)` with `CallFlags.States`

**Step 3: Estimate fees safely**
- Prefer RPC-backed fee calculation over hardcoded values.
- Only fall back to explicit fixed fees if the RPC calculation path proves unavailable and the transaction shape is still independently verified.

**Step 4: Persist the request**
- Insert the governance proposal into Supabase using the same payload shape the UI expects.
- If safe, store the creator’s first signature/witness fragment too.

### Task 4: Final verification

**Files:**
- Verify touched governance files only

**Step 1: Run lint**
Run: `npx eslint src/views/Tools/GovernanceTool.vue src/views/Tools/GovernanceProposalDetail.vue src/utils/multisigWitness.js tests/views/GovernanceToolNetworkChange.spec.js tests/views/GovernanceProposalDetail.spec.js tests/utils/multisigWitness.spec.js`

**Step 2: Run focused governance tests**
Run: `npm test -- tests/views/GovernanceToolNetworkChange.spec.js tests/views/GovernanceProposalDetail.spec.js tests/utils/multisigWitness.spec.js`

**Step 3: Run build**
Run: `npm run build`

**Step 4: Review diff**
Run: `git diff --stat`
