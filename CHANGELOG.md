# Changelog

All notable changes to Neo Explorer UI will be documented in this file.

## [Unreleased]

### Security

- **Multisig mutation replay protection**: the multisig PATCH signed-challenge now binds a client `Signed At` timestamp into the signed message (bumped to `v2`) and records each accepted signature single-use in a new `multisig_mutation_used` table (migration `0002`). The server rejects stale timestamps (`MULTISIG_MUTATION_FRESHNESS_MS`, default 120s) and returns 409 on a reused signature, so a captured mutation signature can no longer be replayed to roll proposal state backward. The verified message is also built from a **canonicalized** network (`resolveRequestNetwork`, collapsing aliases like `testt5` → `testnet`) to match the client's `getNetworkMode`, fixing a byte-parity divergence that would otherwise 403 every mutation on a non-canonically-stored proposal. Front/back message builders kept byte-identical; covered by `tests/api/multisigRequestPatch.spec.js`.
- **Sponsor declared-systemFee cap (gas-drain fix)**: `api/sponsor.js` now rejects any sponsored transaction whose *declared* `systemFee` (embedded in the client-supplied, user-signed tx) exceeds `SPONSOR_MAX_SYSTEM_FEE`, before the sponsor signs. The previous pass capped only the simulated `gasconsumed`, but Neo N3 charges the sender (here the sponsor) the full declared SystemFee — unconsumed gas is burned, not refunded — so an attacker could submit a cheap-to-execute claim/vote script with an inflated declared fee and drain the sponsor wallet up to the rate limit. The tx cannot be rebuilt server-side (that would invalidate the user's witness), so reject-on-cap is the correct defense. Added a source-invariant regression test (`tests/security/SponsorSystemFeeCap.spec.js`).
- **DB TLS certificate verification**: `api/lib/db.js` and `api/lib/chatSupabase.js` no longer hardcode `rejectUnauthorized:false` (which accepted any cert and allowed MITM of all DB traffic). A shared `api/lib/pgSsl.js` now prefers a pinned CA (`DB_SSL_CA`/`DB_SSL_CA_FILE` → verify-full), then system-trust verification (`DB_SSL_REJECT_UNAUTHORIZED=1`), and warns loudly when verification is still disabled. Pools also gained connection/statement/query timeouts.
- **Relayer/sponsor rate-limit on Vercel**: `relayerRateLimit.js` now auto-enables `trustProxy` when running on Vercel (matching `simpleRateLimit.js`), preferring `x-vercel-forwarded-for`. Previously `trustProxy` defaulted off, so `req.socket.remoteAddress` was always the platform proxy and every client collapsed into one global bucket — making the money endpoints' per-IP cap useless. `RELAYER_TRUST_PROXY=0/1` overrides.
- **Multisig PATCH field lockdown**: `api/multisig/requests/[id].js` now rejects mutation of `params` / `unsigned_tx` / `creator_address` (immutable after creation) and shape-validates `status` / `broadcast_tx_hash` / `metadata`. Because PATCH authorizes by a self-asserted address, allowing `params` through let any same-origin visitor rewrite the committee set that `governanceSignature.js` trusts. Added `tests/security/MultisigPatchFieldLockdown.spec.js`.
- **Multisig signature insert race**: added a `UNIQUE(request_id, signer_address)` constraint (migration `supabase/migrations/0001_multisig_signatures_unique.sql`) and made `api/multisig/signatures.js` translate the unique-violation into the existing 409/overwrite path, closing the check-then-insert race that could persist duplicate signatures.

### Fixed

- **Blank-screen on bootstrap failure**: `main.js` now installs global `error`/`unhandledrejection` handlers *before* any async init (they previously ran only after `await initializeI18n()`), buffers early errors until telemetry is ready, wraps `bootstrap()` with chunk-reload recovery + a static fallback shell, and `i18n` falls back to English when a preferred-locale chunk fails instead of white-screening. `router.onError` now reports to telemetry and triggers chunk-reload recovery.
- **Render-error containment**: added a reusable `ErrorBoundary` (`onErrorCaptured`) around the routed view, so a throw in one view shows a recoverable fallback instead of unmounting the whole app.
- **MultiSig blind-signing**: the MultiSig signing modal now renders the decoded `UnsignedTransactionViewer` (script, signers, fees) instead of only opaque hex — WYSIWYS parity with the governance flow, reducing the phishing surface for in-app-key wallets.
- **Load-more cache**: `useLoadMore` no longer forces `forceRefresh:true` on every page (which defeated the TanStack cache); append-only history pages are now cacheable.
- **Network-alerts cron**: `check_alerts.js` now persists detection state regardless of email delivery (stopping a re-alert storm when email fails) and evaluates mainnet/testnet with `Promise.allSettled` so a mainnet failure no longer starves testnet.

### Removed

- Dropped the unused `@openai/codex` runtime dependency and declared the previously phantom-imported `@web3auth/auth`.

## [1.3.0] — 2026-06-17

### Added

- **Realtime transaction stream (SSE)**: home page now prepends newly-confirmed transactions live via a `sse/transactions` channel, with graceful polling fallback.
- **Full paginated CSV export**: Transactions and Blocks pages now export up to 5000 rows (all pages) instead of just the visible ~20.
- **Read-API REST documentation**: `/api-docs` now documents the current Postgres-backed REST endpoints (30+ endpoints with curl examples, params, categories) alongside the legacy JSON-RPC docs.
- **USD portfolio valuation**: address page shows per-asset (NEO/GAS) ≈ USD values and a Total Value card, powered by the `/api/prices` endpoint.
- **Rich-list Value (USD) column**: the Accounts page rich list now shows each account's NEO+GAS value in USD.

### Fixed

- **Multisig CSRF + authorization**: blocked cross-origin mutations (same-origin guard + tightened CORS); PATCH now requires committee membership or creator ownership.
- **Sponsor rate limiting + fee cap**: replaced bypassable in-memory limiter with the shared Upstash-backed limiter; added systemFee cap + pre-broadcast simulation.
- **PostgREST injection surface**: contract/token/account services now validate hash/address/token-id shapes before building `eq.`/`in.()` predicates.
- **Relayer hardening**: info action no longer leaks the funder address; meta-tx args bounded (depth 8, length 16) and Integer range-checked against the Neo VM 256-bit limit; nonce freshness checked server-side.
- **i18n**: all new feature strings internationalized across 5 languages (en, zh_cn, ko, ja, fr).

### Changed

- Cleaned up low-severity issues: testnet NNS resolution, dead executionService stubs, `legacyFallbacks`→`mappers` rename, axios interceptor structured logging, sessionStorage cache validation, in-flight dedup map caps, uploadVerification tagged-error paths.

## [Unreleased]

### Fixed

- Fixed network switching across explorer pages, detail views, and tool workflows.
- Fixed configured RPC base URL rewriting and failover to stay aligned with the active explorer network.
- Fixed stale Supabase metadata and multisig/governance request data leaking across mainnet and testnet.
- Fixed Web3Auth network reinitialization and Web3Auth wallet signing to use RPC-derived network magic.
- Fixed listener lifecycle cleanup for shared network-change handlers.

### Changed

- Added a shared `useNetworkChange` composable for consistent network-switch event handling.
- Added shared request-network normalization helpers for governance and multisig tools.
- Updated development docs with network-switching conventions and refreshed build/test baseline notes.

## [1.1.0] - 2026-02-19

### Added

- **WalletConnect v2**: Full WalletConnect integration for contract write operations via QR pairing
- **Smart Result Decoding**: NeoVM stack item decoder with Address/String/Integer/Hex/Array/Map type detection and raw/decoded toggle
- **Type-Aware Parameter Inputs**: Boolean toggle, Integer validation, Hash160/Hash256 format indicators, JSON textarea for Array/Map
- **Gas Estimation**: Test invoke before write transactions to display estimated GAS cost
- **Transaction Tracking**: Polls `getapplicationlog` for write tx confirmation status (pending → confirmed/failed)
- **WalletConnect Modal**: URI copy dialog with approval spinner for WalletConnect pairing flow
- **Signer Scope Selection**: Dropdown for CalledByEntry, Global, CustomContracts, CustomGroups scopes on write methods

### Changed

- **useMethodInteraction**: Added `gasEstimate`/`estimating` state fields and `estimateGas()` function; `invokeMethod` now accepts options passthrough for signer scope
- **walletService**: Added WalletConnect provider, `scope` parameter on `invoke()`, WC session lifecycle management
- **ContractReadTab**: Integrated decoded result display with type badges, ParamInput component, raw/decoded toggle
- **ContractWriteTab**: WalletConnect button, signer scope select, gas estimate UI, tx tracking status indicators
- **NEP Badges**: Extracted to shared `nepBadges.js` utility (DRY across Header, OverviewCard, CodeTab)

### Removed

- Dead `SignerScopeSelect.vue` and `ParamInput.vue` files

## [1.0.0] - 2025-01-28

### Added

- **Testing Framework**: Vitest unit testing with 36 test cases covering stores and utilities
- **Documentation**: Comprehensive README, development guide, and deployment guide
- **New Components**: ErrorState, LoadingOverlay, and modernized page components
- **Search Functionality**: Enhanced SearchResults with actual search capabilities
- **Network Analytics**: ChartsPage with network statistics visualization

### Changed

- **UI Modernization**: Etherscan-style header with mega menu navigation
- **Component Refactoring**: Consolidated component exports and improved code organization
- **Page Enhancements**:
  - TxDetailNew with expanded transaction details
  - AddressDetailNew with tabbed UI
  - ContractDetailNew with tabs interface
  - TokenDetailNew with improved UI
  - NFT pages (NftGallery, NFTInfoNew) with enhanced displays
  - BurnGasNew, ApiDocs, DevTools pages modernized
  - ErrorPage, SearchNotFound, PageNotFound redesigned

### Fixed

- **Security**: Multiple rounds of dependency upgrades to eliminate vulnerabilities
- **Code Quality**: Removed unused imports and legacy components (29 unused components removed)
- **Router**: Updated to use new Etherscan-style components

### Security

- Upgraded dependencies to fix critical vulnerabilities
- 6 rounds of security fixes applied

### Removed

- 29 unused legacy components
- Deprecated NotFound components
- Unused imports throughout codebase
