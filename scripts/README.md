# Scripts Guide

This repository contains two kinds of utility scripts:

1. **Root ad hoc scripts** — one-off or maintenance helpers kept at the repo root
2. **Isolated script package** — `scripts/abstract-account-test/`, which has its own `package.json`

## Root Scripts

These run against the root repository environment and use the root dependency set.

### `convert.js`
Converts known validator public keys into Neo N3 addresses.

Run:
```bash
node convert.js
```

### `fix-storage-keys.js`
Performs a search/replace pass over `contracts/AbstractAccount/*.cs` to migrate storage-key access patterns.

Run:
```bash
node fix-storage-keys.js
```

### `deploy-test-ecdsa.js`
Ad hoc deployment helper for the `TestECDSA` contract on testnet.

Required environment variables:
- `TEST_ECDSA_DEPLOYER_WIF` or `DEPLOYER_WIF`
- optional `RPC_URL`

### `test-ecdsa.js`
Ad hoc test harness for ECDSA verification behavior.

### `test-compute-hash.js`
Ad hoc hash computation/invocation helper for abstract account contract methods.

### `test-neo-go-pubkey.js`
Small inspection helper for EVM public key encoding / byte layout.

### `register_domains.js`
Bulk Matrix domain registration helper.

Required environment variables:
- `DEPLOYER_WIF`
- optional `RPC_URL`
- optional `MATRIX_CONTRACT_HASH`

### `patch-wallet.js`
Legacy one-off source patch helper. Review before running.

## Isolated Script Package

`scripts/abstract-account-test/` is intentionally isolated because it has script-specific runtime dependencies and testnet/mainnet helpers that should not expand the main app dependency surface.

It currently declares its own dependencies in:
- `scripts/abstract-account-test/package.json`

Run scripts from that directory when working on abstract-account validation helpers.

Example:
```bash
cd scripts/abstract-account-test
node aa_testnet_full_validate.js
```

## Maintenance Rule

If a script:
- needs its own dependencies,
- targets a niche workflow,
- or is not part of the normal app/runtime path,

prefer keeping it in an isolated script package instead of adding more top-level dependencies.

### `contracts/NameService/deploy_mainnet.js`
Mainnet NameService deployment helper.

Required environment variables:
- `NAMESERVICE_MAINNET_DEPLOYER_WIF` or `DEPLOYER_WIF`
- optional `RPC_URL`

### `contracts/NameService/deploy_testnet.js`
Testnet NameService deployment helper.

Required environment variables:
- `NAMESERVICE_TESTNET_DEPLOYER_WIF` or `DEPLOYER_WIF`
- optional `RPC_URL`

## Root Compatibility Wrappers

The historical root script entrypoints are kept as tiny wrappers that delegate into `scripts/root-tools/` so existing commands continue to work while the implementation lives in the isolated package.
