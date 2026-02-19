# Changelog

All notable changes to Neo Explorer UI will be documented in this file.

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
