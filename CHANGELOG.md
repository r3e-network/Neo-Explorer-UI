# Changelog

All notable changes to Neo Explorer UI will be documented in this file.

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
