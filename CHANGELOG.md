# Changelog

All notable changes to Neo Explorer UI will be documented in this file.

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
