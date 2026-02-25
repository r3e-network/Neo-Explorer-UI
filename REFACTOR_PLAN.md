# Neo N3 Explorer — Professional Refactoring Plan

## Vision

Transform Neo-Explorer-UI into a production-grade, Etherscan-quality blockchain explorer purpose-built for Neo N3, with execution tracing for complex transactions.

## Architecture Decisions

- **Frontend**: Vue 3.5 + Composition API (migrate remaining Options API)
- **Styling**: Tailwind CSS 3.4 (already in place)
- **Backend**: neo3fura (Go + MongoDB) — extend with execution trace API
- **State**: Composables pattern (no Vuex/Pinia needed for this scale)

---

## Work Streams (Parallel Execution)

### Stream 1: Core Services & API Layer

**Owner**: services-agent

- [x] Add `getApplicationLog(txHash)` to transactionService
- [x] Add `getInternalTransactions(txHash)` to transactionService
- [x] Add `getExecutionTrace(txHash)` to new executionService
- [x] Add `getContractManifest(hash)` to contractService
- [x] Add `getContractABI(hash)` to contractService
- [x] Add `invokeContractRead(hash, method, params)` to contractService
- [x] Add `getTokenTransfersByTx(txHash)` to tokenService
- [x] Add `getAddressTokenHoldings(address)` to accountService
- [x] Add `getGasTracker()` to statsService
- [x] Add `getDailyAddressGrowth()` to statsService
- [x] Create `src/services/executionService.js` for trace APIs
- [x] Update `src/services/cache.js` with trace cache TTL

### Stream 2: Transaction Detail Enhancement (P0)

**Owner**: tx-detail-agent

- [x] Add Application Log section to TxDetailNew.vue
- [x] Add Notifications/Events tab with decoded parameters
- [x] Add Token Transfers section (NEP-17 + NEP-11)
- [x] Add "Transaction Action" human-readable summary line
- [x] Add confirmation count display
- [x] Add tabbed interface (Overview | Logs | State | Execution Trace)
- [x] Add "More Details" expandable section

### Stream 3: Execution Trace Feature (P1 — Flagship)

**Owner**: trace-agent

- [x] Create `src/components/trace/ExecutionTraceView.vue` — tree visualization
- [x] Create `src/components/trace/ContractCallMap.vue` — invocation graph
- [x] Create `src/components/trace/StackViewer.vue` — NeoVM stack display
- [x] Create `src/components/trace/NotificationDecoder.vue` — event decoder
- [x] Create `src/views/Transaction/TxExecutionTrace.vue` — full page view
- [x] Integrate trace tab into TxDetailNew.vue
- [x] Smart detection: only show trace for complex transactions (>1 contract call)
- [x] Simple transfers: show clean, minimal view

### Stream 4: Contract Detail Enhancement (P1)

**Owner**: contract-agent

- [x] Add Read Contract tab with method invocation UI
- [x] Add Write Contract tab (wallet connection placeholder)
- [x] Add Contract Manifest viewer (formatted JSON + ABI browser)
- [x] Add Analytics tab with invocation charts
- [x] Add Internal Transactions tab
- [x] Enhance Code tab with compiler info display
- [x] Add NEP standard detection badges (NEP-17, NEP-11, NEP-27)

### Stream 5: Address Detail Enhancement (P1)

**Owner**: address-agent

- [x] Add balance display (NEO + GAS) to AddressDetailNew.vue
- [x] Add token holdings panel with USD values
- [x] Add NFT holdings grid view
- [x] Add tabbed interface: Transactions | Token Transfers | NFT Transfers | Contract
- [x] Add transaction table with Method column and direction badges (IN/OUT)
- [x] Add CSV export button

### Stream 6: Navigation & Layout Polish (P2)

**Owner**: layout-agent

- [x] Add Developers dropdown to AppHeader (API Docs, Verify Contract, Contract Search)
- [x] Add "More" mega-menu (Tools: Unit Converter, CSV Export; Explore: Gas Tracker)
- [x] Add search filter dropdown to SearchBox component
- [x] Add keyboard shortcut `/` to focus search
- [x] Polish AppFooter with 4-column layout
- [x] Add breadcrumb component (reusable)
- [x] Add "Back to Top" button
- [x] Ensure all pages have consistent breadcrumb navigation

### Stream 7: New Pages & Features (P2)

**Owner**: pages-agent

- [x] Create Gas Tracker page (`/gas-tracker`)
- [x] Create Charts & Analytics page with multiple chart types
- [x] Create Advanced Search page (`/advanced-search`)
- [x] Add address growth chart
- [x] Add contract deployment chart
- [x] Add token transfer volume chart
- [x] Add GAS price history chart

### Stream 8: neo3fura Backend Enhancement

**Owner**: backend-agent (works on /home/neo/git/neo3fura/)

- [ ] Add `GetApplicationLog` API endpoint
- [ ] Add `GetExecutionTrace` API endpoint (parse NeoVM execution)
- [ ] Add `GetInternalTransactions` API endpoint
- [ ] Add `GetTokenTransfersByTransaction` API endpoint
- [ ] Add `GetAddressTokenHoldings` API endpoint
- [ ] Add `GetGasTracker` API endpoint
- [ ] Add execution trace indexing for complex transactions
- [ ] Add MongoDB indexes for new queries

---

## Execution Order

1. **Phase 1** (Parallel): Streams 1, 2, 6, 8 — Foundation
2. **Phase 2** (Parallel): Streams 3, 4, 5 — Core features
3. **Phase 3** (Parallel): Stream 7 — New pages
4. **Phase 4**: Integration testing, polish, production readiness

## Neo N3 Correctness Checklist

- [ ] All hashes use `0x` prefix (Neo N3 standard)
- [ ] Address format: Neo N3 base58 (starts with 'N')
- [ ] Script hash ↔ Address conversion correct
- [ ] NEP-17 Transfer event: `Transfer(from, to, amount)`
- [ ] NEP-11 Transfer event: `Transfer(from, to, amount, tokenId)`
- [ ] GAS decimals: 8
- [ ] NEO decimals: 0 (indivisible)
- [ ] Block time: ~15 seconds
- [ ] Consensus: dBFT 2.0
- [ ] System fee + Network fee (not just "gas")
