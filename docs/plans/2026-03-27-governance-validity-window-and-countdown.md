# Governance Validity Window And Countdown Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update governance proposal creation so new proposals default to a 30-day valid-until block when protocol timing allows it, and show an expiry countdown next to the valid-until block on proposal detail payloads.

**Architecture:** Keep the block-window math in a small shared utility so creation and display use the same rules. Thread current block height and protocol `msperblock` into the unsigned transaction viewer from the governance detail page, and persist the protocol timing metadata on created proposals so future refreshes remain explainable. This repo already has uncommitted governance work in progress, so implementation must extend the current changes rather than replace them.

**Tech Stack:** Vue 3, Vite, Vitest, Neon JS, Supabase service helpers

### Task 1: Lock the timing rules with focused tests

**Files:**
- Create/Modify: `src/utils/governanceTiming.js`
- Create/Modify: `tests/utils/governanceTiming.spec.js`
- Test: `tests/utils/governanceTiming.spec.js`

**Step 1: Write the failing test**

Use focused assertions for:
- `resolveGovernanceValidUntilBlock()` targeting 30 days when `msPerBlock` allows it
- capping at `maxValidUntilBlockIncrement`
- `describeGovernanceTxExpiry()` showing both future and expired durations

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/utils/governanceTiming.spec.js`
Expected: FAIL if the helper is missing or the 30-day/countdown math is wrong.

**Step 3: Write minimal implementation**

Implement a shared helper that:
- converts timing inputs to positive integers
- computes a 30-day target increment from `msPerBlock`
- caps by protocol max increment when present
- formats expiry strings like `Expires in 20h 55m`

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/utils/governanceTiming.spec.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/governanceTiming.js tests/utils/governanceTiming.spec.js
git commit -m "test: cover governance validity timing"
```

### Task 2: Show the expiry countdown in the decoded unsigned transaction UI

**Files:**
- Modify: `src/components/trace/UnsignedTransactionViewer.vue`
- Modify: `src/views/Tools/components/GovernanceDetailPayload.vue`
- Modify: `src/views/Tools/GovernanceProposalDetail.vue`
- Test: `tests/components/UnsignedTransactionViewer.spec.js`
- Test: `tests/views/GovernanceProposalDetail.spec.js`

**Step 1: Write the failing test**

Add/keep focused tests that assert:
- `UnsignedTransactionViewer` renders a countdown below `Valid Until Block` when given `currentBlockHeight` and `millisecondsPerBlock`
- the governance detail page passes chain timing props down to the payload/viewer path

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/UnsignedTransactionViewer.spec.js tests/views/GovernanceProposalDetail.spec.js`
Expected: FAIL if the countdown is not rendered or the detail page does not load/pass chain timing.

**Step 3: Write minimal implementation**

Thread `currentBlockHeight` and `millisecondsPerBlock` from `GovernanceProposalDetail.vue` into `GovernanceDetailPayload.vue`, then into `UnsignedTransactionViewer.vue`, and render the helper-derived countdown only under `Valid Until Block`.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/UnsignedTransactionViewer.spec.js tests/views/GovernanceProposalDetail.spec.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/trace/UnsignedTransactionViewer.vue src/views/Tools/components/GovernanceDetailPayload.vue src/views/Tools/GovernanceProposalDetail.vue tests/components/UnsignedTransactionViewer.spec.js tests/views/GovernanceProposalDetail.spec.js
git commit -m "feat: show governance proposal expiry countdown"
```

### Task 3: Use the 30-day validity window during proposal creation and keep multisig reads resilient

**Files:**
- Modify: `src/views/Tools/components/GovernanceCreateModal.vue`
- Modify: `src/services/supabaseService.js`
- Test: `tests/views/GovernanceToolNetworkChange.spec.js`
- Test: `tests/services/supabaseServiceMultisig.spec.js`

**Step 1: Write the failing test**

Add/keep tests that assert:
- new governance proposals target a 30-day `validUntilBlock` when protocol timing allows it
- fork refreshes only replace the `validUntilBlock`
- Supabase multisig fetches still recover when the embedded relationship query is unavailable

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/views/GovernanceToolNetworkChange.spec.js tests/services/supabaseServiceMultisig.spec.js`
Expected: FAIL if creation still uses the old fixed increment or if multisig fallback hydration is broken.

**Step 3: Write minimal implementation**

Update `GovernanceCreateModal.vue` to call the shared timing helper, persist protocol timing fields into `params`, and preserve the existing fork-refresh behavior. Keep `supabaseService.js` resilient by falling back to plain request/signature reads when nested relationship selects are unavailable.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/views/GovernanceToolNetworkChange.spec.js tests/services/supabaseServiceMultisig.spec.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/views/Tools/components/GovernanceCreateModal.vue src/services/supabaseService.js tests/views/GovernanceToolNetworkChange.spec.js tests/services/supabaseServiceMultisig.spec.js
git commit -m "feat: default governance proposals to 30 day validity"
```

### Task 4: Final focused verification

**Files:**
- Reference: `src/utils/governanceTiming.js`
- Reference: `src/components/trace/UnsignedTransactionViewer.vue`
- Reference: `src/views/Tools/components/GovernanceCreateModal.vue`
- Reference: `src/views/Tools/GovernanceProposalDetail.vue`

**Step 1: Run the focused suite**

Run: `npm test -- tests/utils/governanceTiming.spec.js tests/components/UnsignedTransactionViewer.spec.js tests/views/GovernanceProposalDetail.spec.js tests/views/GovernanceToolNetworkChange.spec.js tests/services/supabaseServiceMultisig.spec.js`
Expected: PASS

**Step 2: Run lint for touched files if needed**

Run: `npm run lint -- src/components/trace/UnsignedTransactionViewer.vue src/views/Tools/components/GovernanceCreateModal.vue src/views/Tools/GovernanceProposalDetail.vue src/views/Tools/components/GovernanceDetailPayload.vue src/services/supabaseService.js src/utils/governanceTiming.js tests/components/UnsignedTransactionViewer.spec.js tests/views/GovernanceToolNetworkChange.spec.js tests/services/supabaseServiceMultisig.spec.js tests/utils/governanceTiming.spec.js`
Expected: PASS

**Step 3: Review final diff**

Run: `git diff -- src/components/trace/UnsignedTransactionViewer.vue src/views/Tools/components/GovernanceCreateModal.vue src/views/Tools/GovernanceProposalDetail.vue src/views/Tools/components/GovernanceDetailPayload.vue src/services/supabaseService.js src/utils/governanceTiming.js tests/components/UnsignedTransactionViewer.spec.js tests/views/GovernanceToolNetworkChange.spec.js tests/services/supabaseServiceMultisig.spec.js tests/utils/governanceTiming.spec.js`
Expected: Only the governance validity/countdown and multisig fallback changes appear.
