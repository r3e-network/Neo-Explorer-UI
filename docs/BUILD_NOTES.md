# Build Notes

This document captures the current frontend build/chunking decisions for `Neo-Explorer-UI`, the remaining non-actionable build notices, and the verification commands to run before changing bundle structure.

## Current Verification Baseline

As of March 9, 2026, the repo passes all standard quality gates:

```bash
npm run lint
npm test
npm run build
npm run qa
```

Current test baseline:
- `110` test files
- `657` tests
- all passing

## Current Chunking Strategy

`vite.config.js` uses explicit `manualChunks()` rules to keep the largest third-party dependencies out of the generic fallback chunk.

The main dedicated chunks are:
- `neon-js`
- `walletconnect`
- `web3auth`
- `ethers`
- `supabase`
- `chartjs`
- `qrcode`
- `syntax`
- `vue-core`
- `axios`
- `polyfills`
- `crypto`
- `vendor` (fallback for residual dependencies)

There are also targeted transitive ownership rules so that:
- WalletConnect-related transport/relay dependencies stay with `walletconnect`
- Web3Auth-related React/UI dependencies stay with `web3auth`
- App-side `qrcode.vue` stays in a separate `qrcode` chunk

## Why The Split Exists

Without explicit chunk rules, Vite/Rollup tended to produce an oversized fallback chunk and noisy warnings.

The current split was chosen because it gave the best balance of:
- smaller residual `vendor` payload
- fewer confusing build warnings
- stable `qa` results
- predictable chunk ownership for future changes

## Remaining Build Notices

The current production build still prints two third-party notices:

1. `ox` pure annotation warning
   - Rollup reports a `/*#__PURE__*/` annotation position it cannot interpret.
   - This originates from `node_modules/ox/_esm/core/Base64.js`.
   - This is not caused by application code.

2. `vm` externalized for browser compatibility
   - Vite reports that `vm` is externalized for browser compatibility.
   - The import path currently traces through `asn1.js`.
   - This is also a third-party dependency graph notice, not an application runtime failure.

At the moment, these notices are informational and do not block successful builds.

There are no remaining app-side chunk graph warnings in the current build baseline.

## Chunk Warning Threshold

`vite.config.js` sets:

```js
chunkSizeWarningLimit: 1100
```

This threshold matches the current post-split baseline and avoids warning on the now-intentional fallback `vendor` chunk.

If bundle structure changes materially, revisit this threshold rather than raising it casually.

## Build-Sensitive Files

When changing bundle behavior, review these files together:
- `vite.config.js`
- `src/utils/wallet.js`
- `src/services/web3authService.js`
- `tests/config/endpoints.spec.js`
- `tests/services/web3authService.spec.js`
- `tests/utils/walletSource.spec.js`

## Regression Coverage

These tests currently lock in the key build/runtime assumptions:
- `tests/config/endpoints.spec.js`
- `tests/services/web3authService.spec.js`
- `tests/utils/walletSource.spec.js`
- `tests/utils/governanceRequests.spec.js`
- `tests/views/MultiSigRequestFilter.spec.js`
- `tests/services/nnsService.spec.js`
- `tests/composables/useAutoRefreshLifecycle.spec.js`

## If You Change Chunking

Before keeping any chunking change:

1. Run:
   ```bash
   npm run build
   ```
2. Confirm no new circular chunk warnings were introduced.
3. Compare the largest assets under `dist/assets/`.
4. Run:
   ```bash
   npm run qa
   ```
5. Update `tests/config/endpoints.spec.js` if chunking rules changed intentionally.

## Practical Rule

Prefer moving transitive dependencies into the lazy feature chunk that actually owns them.

Avoid creating broad shared chunks unless they clearly reduce warnings and total duplication. Shared runtime chunks can easily introduce circular chunk warnings when both fallback/vendor code and feature chunks import each other.
