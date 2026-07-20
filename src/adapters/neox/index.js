/**
 * Anti-corruption layer for Neo X (Blockscout v2) payloads.
 *
 * Maps Blockscout wire JSON into the canonical domain shapes
 * ({@link module:domain/models}) plus EVM-specific extension fields the N3
 * shapes don't carry (gas, base fee, miner, method, status, ERC standard).
 * Every adapter keeps the original row on `raw` so detail views can read
 * pass-through fields directly.
 *
 * @module adapters/neox
 */

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

/** Blockscout ISO-8601 timestamp → ms since epoch (0 when absent/invalid). */
function toMs(value) {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Finite number or null (Blockscout percentages arrive as JSON numbers). */
function toNumOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Neo X stores the dBFT primary index as a big-endian uint64 nonce. */
function toPrimaryIndex(value) {
  if (value === undefined || value === null || value === "") return null;
  try {
    const parsed = BigInt(value);
    if (parsed < 0n || parsed > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    return Number(parsed);
  } catch (_err) {
    return null;
  }
}

/** Blockscout addresses appear as either "0x.." or { hash: "0x..", ... }. */
function addressOf(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.hash || value.address_hash || null;
}

/** Blockscout amounts appear as strings or { value, ... } wrappers. */
function amountOf(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "object") return value.value ?? null;
  return String(value);
}

/** "ERC-20" → "ERC20"; "ERC-721" → "ERC721"; passthrough otherwise. */
function normalizeStandard(type) {
  if (!type) return undefined;
  return String(type).replace(/-/g, "").toUpperCase();
}

/**
 * Normalize a Blockscout rich address object (or bare "0x.." string) into a
 * flat info shape views can use for name tags and verified/scam badges.
 *
 * @param {Object|string|null} value - Rich address object or bare hash.
 * @returns {{hash: string, name: string|null, isContract: boolean,
 *   isVerified: boolean, isScam: boolean, proxyType: string|null,
 *   implementations: Array, raw: Object|string}|null}
 */
export function toXAddressInfo(value) {
  if (!value) return null;
  if (typeof value === "string") {
    return {
      hash: value,
      name: null,
      isContract: false,
      isVerified: false,
      isScam: false,
      proxyType: null,
      implementations: [],
      raw: value,
    };
  }
  const hash = value.hash || value.address_hash || null;
  if (!hash) return null;
  return {
    hash,
    name: value.name ?? null,
    isContract: Boolean(value.is_contract),
    isVerified: Boolean(value.is_verified),
    isScam: Boolean(value.is_scam),
    proxyType: value.proxy_type ?? null,
    implementations: Array.isArray(value.implementations) ? value.implementations : [],
    raw: value,
  };
}

/**
 * Canonical Block + EVM extensions from a Blockscout /blocks item.
 * @param {Object} raw
 * @returns {(import("../../domain/models.js").Block & Object)|null}
 */
export function toXBlock(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    hash: raw.hash || "",
    index: toInt(firstDefined(raw.height, raw.number)),
    timestampMs: toMs(raw.timestamp),
    txCount: toInt(firstDefined(raw.transactions_count, raw.tx_count, raw.transaction_count)),
    prevHash: raw.parent_hash,
    // EVM extensions
    gasUsed: firstDefined(raw.gas_used, "0"),
    gasLimit: firstDefined(raw.gas_limit, "0"),
    gasUsedPercentage: toNumOrNull(raw.gas_used_percentage),
    baseFeePerGas: raw.base_fee_per_gas ?? null,
    burntFees: raw.burnt_fees ?? null,
    burntFeesPercentage: toNumOrNull(raw.burnt_fees_percentage),
    priorityFee: raw.priority_fee ?? null,
    transactionFees: raw.transaction_fees ?? null,
    internalTransactionsCount: toInt(raw.internal_transactions_count, 0),
    withdrawalsCount: toInt(raw.withdrawals_count, 0),
    nonce: raw.nonce ?? null,
    primaryIndex: toPrimaryIndex(raw.nonce),
    difficulty: raw.difficulty ?? null,
    miner: addressOf(raw.miner),
    minerInfo: toXAddressInfo(raw.miner),
    size: toInt(raw.size),
    raw,
  };
}

/**
 * Canonical Transaction + EVM extensions from a Blockscout /transactions item.
 * @param {Object} raw
 * @returns {(import("../../domain/models.js").Transaction & Object)|null}
 */
export function toXTransaction(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    hash: raw.hash || "",
    blockIndex: toInt(firstDefined(raw.block, raw.block_number, raw.blockNumber), undefined),
    timestampMs: toMs(raw.timestamp),
    sender: addressOf(raw.from),
    // EVM extensions
    to: addressOf(raw.to),
    value: amountOf(raw.value),
    fee: amountOf(raw.fee),
    gasUsed: firstDefined(raw.gas_used, null),
    gasPrice: firstDefined(raw.gas_price, null),
    gasLimit: raw.gas_limit ?? null,
    maxFeePerGas: raw.max_fee_per_gas ?? null,
    maxPriorityFeePerGas: raw.max_priority_fee_per_gas ?? null,
    priorityFee: raw.priority_fee ?? null,
    burntFee: raw.transaction_burnt_fee ?? null,
    baseFeePerGas: raw.base_fee_per_gas ?? null,
    method: raw.method ?? null,
    status: raw.status ?? raw.result ?? null, // "ok" | "error"
    txTypes: Array.isArray(raw.transaction_types) ? raw.transaction_types : [],
    transactionTypes: Array.isArray(raw.transaction_types) ? raw.transaction_types : [],
    txType: raw.type ?? null, // EVM tx type number (2 = EIP-1559)
    nonce: raw.nonce ?? null,
    position: raw.position ?? null,
    decodedInput: raw.decoded_input ?? null,
    rawInput: raw.raw_input ?? null,
    confirmations: toInt(raw.confirmations, 0),
    confirmationDuration: Array.isArray(raw.confirmation_duration) ? raw.confirmation_duration : null,
    revertReason: raw.revert_reason ?? null,
    hasErrorInInternalTransactions: Boolean(raw.has_error_in_internal_transactions),
    tokenTransfers: Array.isArray(raw.token_transfers) ? raw.token_transfers : [],
    fromInfo: toXAddressInfo(raw.from),
    toInfo: toXAddressInfo(raw.to),
    createdContract: toXAddressInfo(raw.created_contract),
    raw,
  };
}

/**
 * Canonical AccountOverview + EVM extensions from a Blockscout /addresses/{h}.
 * @param {Object} raw
 * @param {string} [addressFallback] - The requested address, used when the
 *   payload omits `hash`.
 * @returns {(import("../../domain/models.js").AccountOverview & Object)|null}
 */
export function toXAddress(raw, addressFallback) {
  if (!raw || typeof raw !== "object") return null;
  return {
    address: addressOf(raw.hash) || addressFallback || "",
    // EVM extensions
    coinBalance: raw.coin_balance ?? "0",
    isContract: Boolean(raw.is_contract),
    isVerified: Boolean(raw.is_verified),
    isScam: Boolean(raw.is_scam),
    reputation: raw.reputation ?? null,
    proxyType: raw.proxy_type ?? null,
    name: raw.name ?? null,
    creationTxHash: raw.creation_transaction_hash ?? null,
    creator: addressOf(raw.creator_address_hash),
    implementations: Array.isArray(raw.implementations) ? raw.implementations : [],
    token: raw.token ?? null,
    hasLogs: Boolean(raw.has_logs),
    hasTokenTransfers: Boolean(raw.has_token_transfers),
    hasTokens: Boolean(raw.has_tokens),
    hasValidatedBlocks: Boolean(raw.has_validated_blocks),
    raw,
  };
}

/**
 * Canonical TokenSummary + EVM extensions from a Blockscout token payload.
 * @param {Object} raw
 * @returns {(import("../../domain/models.js").TokenSummary & Object)|null}
 */
export function toXToken(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    contractHash: addressOf(raw.address) || raw.address_hash || "",
    symbol: raw.symbol ?? null,
    name: raw.name ?? null,
    decimals: toInt(raw.decimals, undefined),
    standard: normalizeStandard(raw.type),
    totalSupply: amountOf(raw.total_supply),
    holders: toInt(firstDefined(raw.holders, raw.holders_count)),
    exchangeRate: raw.exchange_rate ?? null,
    iconUrl: raw.icon_url ?? null,
    raw,
  };
}

/**
 * Event log from /transactions/{hash}/logs (or /addresses/{hash}/logs).
 * @param {Object} raw
 * @returns {Object|null}
 */
export function toXLog(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    index: toInt(raw.index, 0),
    address: toXAddressInfo(raw.address),
    topics: Array.isArray(raw.topics) ? raw.topics.filter((topic) => topic !== null && topic !== undefined) : [],
    data: raw.data ?? null,
    decoded: raw.decoded ?? null, // { method_call, method_id, parameters }
    blockNumber: toInt(raw.block_number, undefined),
    blockTimestampMs: toMs(raw.block_timestamp),
    transactionHash: raw.transaction_hash ?? null,
    raw,
  };
}

/**
 * Internal transaction from /transactions/{hash}/internal-transactions or
 * /addresses/{hash}/internal-transactions.
 * @param {Object} raw
 * @returns {Object|null}
 */
export function toXInternalTx(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    type: raw.type ?? null, // "call" | "delegatecall" | "staticcall" | "create" | ...
    from: toXAddressInfo(raw.from),
    to: toXAddressInfo(raw.to),
    value: amountOf(raw.value),
    success: Boolean(raw.success),
    error: raw.error ?? null,
    gasLimit: raw.gas_limit ?? null,
    createdContract: toXAddressInfo(raw.created_contract),
    index: toInt(raw.index, 0),
    blockNumber: toInt(raw.block_number, undefined),
    timestampMs: toMs(raw.timestamp),
    transactionHash: raw.transaction_hash ?? null,
    raw,
  };
}

/**
 * Balance state change from /transactions/{hash}/state-changes.
 * @param {Object} raw
 * @returns {Object|null}
 */
export function toXStateChange(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    address: toXAddressInfo(raw.address),
    type: raw.type ?? null, // "coin" | "token"
    balanceBefore: amountOf(raw.balance_before),
    balanceAfter: amountOf(raw.balance_after),
    // `change` is a signed base-unit string for coin/ERC-20 rows but can be a
    // structured array for NFT rows — preserve non-scalar shapes as-is.
    change: typeof raw.change === "string" || typeof raw.change === "number" ? String(raw.change) : (raw.change ?? null),
    isMiner: Boolean(raw.is_miner),
    token: raw.token ?? null,
    tokenId: raw.token_id ?? null,
    raw,
  };
}

/**
 * NFT instance from /tokens/{hash}/instances.
 * @param {Object} raw
 * @returns {Object|null}
 */
export function toXTokenInstance(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    id: raw.id !== undefined && raw.id !== null ? String(raw.id) : null,
    imageUrl: raw.image_url ?? null,
    metadata: raw.metadata ?? null, // { name, description, image, attributes } | null
    animationUrl: raw.animation_url ?? null,
    mediaUrl: raw.media_url ?? null,
    mediaType: raw.media_type ?? null,
    thumbnails: raw.thumbnails ?? null,
    owner: toXAddressInfo(raw.owner),
    isUnique: Boolean(raw.is_unique),
    raw,
  };
}

/**
 * Token holder row from /tokens/{hash}/holders.
 * @param {Object} raw
 * @returns {Object|null}
 */
export function toXHolder(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    address: toXAddressInfo(raw.address),
    value: amountOf(raw.value),
    tokenId: raw.token_id ?? null,
    raw,
  };
}

/**
 * Counters from /addresses/{hash}/counters or /tokens/{hash}/counters.
 * Blockscout returns numeric strings; every field is normalized to a number.
 * @param {Object} raw
 * @returns {Object|null}
 */
export function toXCounters(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    transactionsCount: toInt(raw.transactions_count, 0),
    tokenTransfersCount: toInt(raw.token_transfers_count, 0),
    gasUsageCount: toInt(raw.gas_usage_count, 0),
    validationsCount: toInt(raw.validations_count, 0),
    tokenHoldersCount: toInt(raw.token_holders_count, 0),
    transfersCount: toInt(raw.transfers_count, 0),
    raw,
  };
}

/**
 * Adapt a Blockscout list envelope ({ items, next_page_params }) into a
 * cursor page: { items: T[], nextPageParams: Object|null }.
 *
 * @template T
 * @param {Object} payload
 * @param {(raw: Object) => (T|null)} adapt
 * @returns {{ items: T[], nextPageParams: Object|null }}
 */
export function toXPage(payload, adapt) {
  const rawItems = Array.isArray(payload?.items) ? payload.items : [];
  const items = rawItems.map(adapt).filter(Boolean);
  return { items, nextPageParams: payload?.next_page_params ?? null };
}
