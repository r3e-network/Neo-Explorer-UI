# Council Governance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a user-friendly council governance workflow where council nodes create proposals, all users can view proposal details and vote status, council members sign once, signatures are stored in Supabase, and fully signed proposals can be broadcast on-chain.

**Architecture:** Reuse the existing `multisig_requests` and `multisig_signatures` persistence model, but make governance a first-class flow instead of a thin modal over generic multisig requests. Add proposal-detail routing and richer Supabase helpers while keeping the threshold derived from the live committee multisig configuration.

**Tech Stack:** Vue 3, Vue Router, Vitest, Supabase JS, neon-js.

### Task 1: Lock down the target governance behavior with tests

**Files:**
- Modify: `tests/views/GovernanceToolNetworkChange.spec.js`
- Create/Modify: `tests/services/supabaseServiceMultisig.spec.js`
- Create: `tests/views/GovernanceProposalDetail.spec.js`

**Step 1: Write failing tests**
- Add coverage for:
  - proposal list rendering with detail navigation
  - detail panel/page showing proposal description, method, target, status, threshold, signer list
  - signer/voter list showing who signed
  - council signer can sign only once
  - fully signed proposal exposes broadcast state

**Step 2: Run tests to verify failure**
Run: `npm test -- tests/views/GovernanceToolNetworkChange.spec.js tests/views/GovernanceProposalDetail.spec.js tests/services/supabaseServiceMultisig.spec.js`

**Step 3: Implement minimal code to satisfy tests**
- Touch only the smallest governance data helpers first.

**Step 4: Run tests to verify pass**
Run the same command and confirm green.

### Task 2: Extend Supabase governance persistence helpers

**Files:**
- Modify: `src/services/supabaseService.js`
- Test: `tests/services/supabaseServiceMultisig.spec.js`

**Step 1: Add failing tests**
- Proposal fetch by id
- Duplicate signature prevention
- Status update on execute
- Signature metadata persistence shape

**Step 2: Run tests to verify failure**
Run: `npm test -- tests/services/supabaseServiceMultisig.spec.js`

**Step 3: Write minimal implementation**
- Add helpers for:
  - `getMultisigRequestById`
  - duplicate-safe `addMultisigSignature`
  - `updateMultisigRequestStatus`
- Keep network-aware reads.

**Step 4: Run tests to verify pass**
Run: `npm test -- tests/services/supabaseServiceMultisig.spec.js`

### Task 3: Add proposal detail routing and user-friendly governance UI

**Files:**
- Modify: `src/router/index.js`
- Modify: `src/views/Tools/GovernanceTool.vue`
- Create: `src/views/Tools/GovernanceProposalDetail.vue`
- Test: `tests/views/GovernanceToolNetworkChange.spec.js`
- Test: `tests/views/GovernanceProposalDetail.spec.js`

**Step 1: Write failing tests**
- Detail route renders proposal content
- Proposal status and signer summary are visible
- Active network filtering still works

**Step 2: Run tests to verify failure**
Run: `npm test -- tests/views/GovernanceToolNetworkChange.spec.js tests/views/GovernanceProposalDetail.spec.js`

**Step 3: Write minimal implementation**
- Add a governance proposal detail route
- Replace raw JSON-first UX with list cards + detail page/panel
- Show vote status, threshold progress, and signer list

**Step 4: Run tests to verify pass**
Run the same command and confirm green.

### Task 4: Enforce single-sign and execute flow

**Files:**
- Modify: `src/views/Tools/GovernanceTool.vue`
- Modify: `src/services/supabaseService.js`
- Test: `tests/views/GovernanceToolNetworkChange.spec.js`
- Test: `tests/services/supabaseServiceMultisig.spec.js`

**Step 1: Write failing tests**
- Council signer cannot sign twice
- Signed proposal marks signer as already voted
- Broadcast updates execution status and tx id

**Step 2: Run tests to verify failure**
Run: `npm test -- tests/views/GovernanceToolNetworkChange.spec.js tests/services/supabaseServiceMultisig.spec.js`

**Step 3: Write minimal implementation**
- Gate duplicate signatures in service/UI
- Persist execution status after successful broadcast
- Keep threshold derived from committee multisig

**Step 4: Run tests to verify pass**
Run the same command and confirm green.

### Task 5: Final verification

**Files:**
- Verify modified files only

**Step 1: Run focused governance tests**
Run: `npm test -- tests/views/GovernanceToolNetworkChange.spec.js tests/views/GovernanceProposalDetail.spec.js tests/services/supabaseServiceMultisig.spec.js`

**Step 2: Run lint on touched files**
Run: `npx eslint src/views/Tools/GovernanceTool.vue src/views/Tools/GovernanceProposalDetail.vue src/services/supabaseService.js src/router/index.js tests/views/GovernanceToolNetworkChange.spec.js tests/views/GovernanceProposalDetail.spec.js tests/services/supabaseServiceMultisig.spec.js`

**Step 3: Run full project verification**
Run: `npm run qa:full`

**Step 4: Review diff**
Run: `git diff --stat`
