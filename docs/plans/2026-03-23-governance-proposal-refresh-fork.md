# Governance Proposal Refresh Fork Implementation Plan

> **For Implementer:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a governance proposal detail action that forks the current proposal into a new editable draft and refreshes the new proposal's `validUntilBlock` at publish time.

**Architecture:** Reuse the existing `GovernanceCreateModal` as the single proposal editor. The detail page will open that modal with a draft derived from the current proposal, while the modal will preserve the original signer configuration, invocation list, and metadata needed to create a fresh proposal row. The unsigned transaction will be rebuilt just before insert so the new proposal gets a current `validUntilBlock` without mutating the original row.

**Tech Stack:** Vue 3, Vite, Vitest, `@cityofzion/neon-js`, Supabase service layer

### Task 1: Add failing proposal-detail fork test

**Files:**
- Modify: `tests/views/GovernanceProposalDetail.spec.js`
- Test: `tests/views/GovernanceProposalDetail.spec.js`

**Step 1: Write the failing test**

Add a test that mounts the proposal detail page with a pending governance proposal containing invocations, signer metadata, and an existing `validUntilBlock`, clicks the new fork button, and asserts that the create modal opens with:
- the original description prefilled
- the original invocation list prefilled
- the original signer configuration preserved
- fork metadata pointing back to the original proposal id

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/views/GovernanceProposalDetail.spec.js`
Expected: FAIL because the detail page does not expose a fork action or mount the create modal with prefilled draft data.

**Step 3: Write minimal implementation**

Add the fork trigger to the detail page and pass draft props into `GovernanceCreateModal`.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/views/GovernanceProposalDetail.spec.js`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/views/GovernanceProposalDetail.spec.js src/views/Tools/GovernanceProposalDetail.vue
git commit -m "feat: add governance proposal fork entry point"
```

### Task 2: Add failing create-modal publish test

**Files:**
- Modify: `tests/views/GovernanceToolNetworkChange.spec.js`
- Modify: `src/views/Tools/components/GovernanceCreateModal.vue`
- Test: `tests/views/GovernanceToolNetworkChange.spec.js`

**Step 1: Write the failing test**

Add a test that mounts the governance tool, injects a fork draft into the create modal state, publishes the forked proposal, and asserts that:
- a new `multisig_requests` payload is inserted
- the new payload stores `params.forked_from_proposal_id`
- the new payload stores a refreshed `validUntilBlock`
- the new payload preserves the original signer account and committee metadata
- the user can edit the description before publish

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/views/GovernanceToolNetworkChange.spec.js`
Expected: FAIL because the modal cannot accept an external draft and does not stamp refresh metadata into the inserted payload.

**Step 3: Write minimal implementation**

Teach `GovernanceCreateModal` to accept an initial draft, hydrate the form from it, preserve signer metadata when forking, and rebuild the unsigned transaction with a fresh `validUntilBlock` on create.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/views/GovernanceToolNetworkChange.spec.js`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/views/GovernanceToolNetworkChange.spec.js src/views/Tools/components/GovernanceCreateModal.vue
git commit -m "feat: create refreshed governance proposal forks"
```

### Task 3: Add copy and affordance coverage

**Files:**
- Modify: `src/lang/en.js`
- Modify: `src/lang/fr.js`
- Modify: `src/lang/ja.js`
- Modify: `src/lang/ko.js`
- Modify: `src/lang/zh_cn.js`
- Test: `tests/views/GovernanceProposalDetail.spec.js`

**Step 1: Write the failing test**

Extend the detail-page test to assert that the fork action label and helper copy render in the action area.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/views/GovernanceProposalDetail.spec.js`
Expected: FAIL because the strings do not exist yet.

**Step 3: Write minimal implementation**

Add the new translation keys and render them in the detail action area.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/views/GovernanceProposalDetail.spec.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lang/en.js src/lang/fr.js src/lang/ja.js src/lang/ko.js src/lang/zh_cn.js tests/views/GovernanceProposalDetail.spec.js
git commit -m "feat: add governance fork action copy"
```

### Task 4: Verify governance flow end-to-end

**Files:**
- Verify: `src/views/Tools/GovernanceProposalDetail.vue`
- Verify: `src/views/Tools/components/GovernanceCreateModal.vue`
- Verify: `tests/views/GovernanceProposalDetail.spec.js`
- Verify: `tests/views/GovernanceToolNetworkChange.spec.js`

**Step 1: Run targeted governance tests**

Run: `npm test -- tests/views/GovernanceProposalDetail.spec.js tests/views/GovernanceToolNetworkChange.spec.js`
Expected: PASS

**Step 2: Run focused compatibility coverage**

Run: `npm test -- tests/views/GovernanceCompatImports.spec.js`
Expected: PASS

**Step 3: Run production build**

Run: `npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add docs/plans/2026-03-23-governance-proposal-refresh-fork.md
git commit -m "docs: add governance refresh fork plan"
```
