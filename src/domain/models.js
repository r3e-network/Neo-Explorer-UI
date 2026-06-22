/**
 * Canonical internal domain models for the explorer.
 *
 * These are documentation-only JSDoc typedefs — there is no runtime export
 * here. They describe the normalized, transport-agnostic shapes that the
 * application's anti-corruption layer (`src/adapters/*`) produces from the
 * various wire formats (indexer snake_case, RPC camelCase/lowercase, legacy
 * Mongo payloads).
 *
 * The canonical shapes are the *internal* contract. Services may still expose
 * a "legacy view" (see `src/adapters/blocks.js#toLegacyBlockView`) to existing
 * components until those components are migrated to consume the canonical
 * model directly.
 *
 * @module domain/models
 */

/**
 * A generic paginated collection.
 *
 * @template T
 * @typedef {Object} Page
 * @property {T[]} items - The page of items (never null; empty array when none).
 * @property {number} total - Total number of items across all pages.
 */

/**
 * Canonical block shape.
 *
 * Field semantics:
 * - `timestampMs` is always milliseconds since the Unix epoch.
 * - `txCount` is the number of transactions in the block.
 * - `sysFee` / `netFee` are aggregate fees for the block. They may be
 *   `undefined` when the source did not provide them (the legacy view keeps
 *   that distinction so downstream enrichment can detect missing fees).
 * - `primary` is the dBFT primary (speaker) index for the block, or
 *   `undefined` when the source omitted it.
 * - `raw` carries the original source object so legacy views can preserve
 *   any pass-through fields (size, version, merkleroot, witnesses, …) that
 *   components read directly off the row.
 *
 * @typedef {Object} Block
 * @property {string} hash - Block hash (0x-prefixed).
 * @property {number} index - Block height / index.
 * @property {number} timestampMs - Block time in milliseconds since epoch.
 * @property {number} txCount - Number of transactions in the block.
 * @property {number} [sysFee] - Aggregate system fee, when available.
 * @property {number} [netFee] - Aggregate network fee, when available.
 * @property {number} [primary] - dBFT primary (speaker) index, when available.
 * @property {string} [nextConsensus] - Next-consensus script hash / address.
 * @property {string} [prevHash] - Previous block hash.
 * @property {Object} [raw] - The original source row (for pass-through fields).
 */

/**
 * Canonical transaction shape.
 *
 * @typedef {Object} Transaction
 * @property {string} hash - Transaction hash (0x-prefixed).
 * @property {number} [blockIndex] - Height of the block that contains the tx.
 * @property {number} [timestampMs] - Block time in milliseconds since epoch.
 * @property {string} [sender] - Sender address.
 * @property {number} [sysFee] - System fee.
 * @property {number} [netFee] - Network fee.
 * @property {number} [validUntilBlock] - Last valid block height.
 * @property {string} [vmState] - VM execution state (e.g. "HALT", "FAULT").
 * @property {Object} [raw] - The original source row.
 */

/**
 * Canonical token transfer shape.
 *
 * @typedef {Object} Transfer
 * @property {string} txHash - Transaction hash of the transfer.
 * @property {string} [from] - Sender address.
 * @property {string} [to] - Recipient address.
 * @property {string} [contractHash] - Token contract hash.
 * @property {string} [amount] - Raw transfer amount (stringified big integer).
 * @property {number} [timestampMs] - Transfer time in milliseconds since epoch.
 * @property {Object} [raw] - The original source row.
 */

/**
 * Canonical account overview shape.
 *
 * @typedef {Object} AccountOverview
 * @property {string} address - The account address.
 * @property {number} [txCount] - Total transactions for the account.
 * @property {number} [firstSeenMs] - First-seen time in milliseconds since epoch.
 * @property {number} [lastSeenMs] - Last-seen time in milliseconds since epoch.
 * @property {Object} [raw] - The original source row.
 */

/**
 * Canonical token summary shape.
 *
 * @typedef {Object} TokenSummary
 * @property {string} contractHash - Token contract hash.
 * @property {string} [symbol] - Token symbol.
 * @property {string} [name] - Token name.
 * @property {number} [decimals] - Token decimals.
 * @property {string} [standard] - Token standard (e.g. "NEP17", "NEP11").
 * @property {string} [totalSupply] - Total supply (stringified big integer).
 * @property {number} [holders] - Number of holders.
 * @property {Object} [raw] - The original source row.
 */

/**
 * Canonical contract-call shape.
 *
 * @typedef {Object} ContractCall
 * @property {string} txHash - Transaction hash of the call.
 * @property {string} [contractHash] - Called contract hash.
 * @property {string} [method] - Invoked method name.
 * @property {number} [timestampMs] - Call time in milliseconds since epoch.
 * @property {Object} [raw] - The original source row.
 */

export {};
