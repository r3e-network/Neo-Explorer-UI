// Neo X dBFT primary-validator resolution.
//
// Neo X block `miner`/coinbase is always GovernanceReward and is not the node
// that proposed the block. The real primary index is encoded in the header
// nonce; the corresponding address comes from Governance.getCurrentConsensus()
// at that block height. Consensus sets are stable for a 60,480-block epoch, so
// a bounded epoch cache keeps list refreshes to one RPC call at most.

import { rpcService } from "./rpcService";

export const GOVERNANCE_ADDRESS = "0x1212000000000000000000000000000000000001";
export const GET_CURRENT_CONSENSUS_SELECTOR = "0x9f9d7f81";
export const NEOX_EPOCH_BLOCKS = 60_480;

const CACHE_TTL_MS = 60 * 60 * 1000;
// Governance calls are cached for an hour; allow slower public mainnet nodes
// enough time to answer rather than permanently degrading the whole epoch.
const RPC_TIMEOUT_MS = 5000;
const MAX_CACHE_ENTRIES = 16;
const MAX_VALIDATORS = 100;

const consensusCache = new Map();
const inflight = new Map();

const epochOf = (blockIndex) => Math.floor(Number(blockIndex) / NEOX_EPOCH_BLOCKS);
const blockTagOf = (blockIndex) => `0x${Math.trunc(Number(blockIndex)).toString(16)}`;
const cacheKeyOf = (net, blockIndex) => `${net}:${epochOf(blockIndex)}`;

function touchCache(key, value) {
  consensusCache.delete(key);
  consensusCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  while (consensusCache.size > MAX_CACHE_ENTRIES) {
    consensusCache.delete(consensusCache.keys().next().value);
  }
}

function readCache(key) {
  const entry = consensusCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    consensusCache.delete(key);
    return null;
  }
  consensusCache.delete(key);
  consensusCache.set(key, entry);
  return entry.value;
}

function parseWord(hex, byteOffset) {
  const start = byteOffset * 2;
  const word = hex.slice(start, start + 64);
  if (word.length !== 64 || !/^[0-9a-f]+$/i.test(word)) throw new Error("Malformed ABI word");
  return BigInt(`0x${word}`);
}

/** Decode the ABI return value of `address[]`. */
export function decodeAddressArrayResult(result) {
  const hex = String(result || "").replace(/^0x/i, "");
  if (hex.length < 128 || hex.length % 64 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    throw new Error("Malformed consensus response");
  }

  const offset = Number(parseWord(hex, 0));
  if (!Number.isSafeInteger(offset) || offset < 32 || offset % 32 !== 0) {
    throw new Error("Invalid consensus array offset");
  }
  const length = Number(parseWord(hex, offset));
  if (!Number.isSafeInteger(length) || length < 1 || length > MAX_VALIDATORS) {
    throw new Error("Invalid consensus validator count");
  }

  const addresses = [];
  for (let index = 0; index < length; index += 1) {
    const wordStart = (offset + 32 + index * 32) * 2;
    const word = hex.slice(wordStart, wordStart + 64);
    if (word.length !== 64 || !/^0{24}[0-9a-f]{40}$/i.test(word)) {
      throw new Error("Invalid consensus validator address");
    }
    addresses.push(`0x${word.slice(24).toLowerCase()}`);
  }
  return addresses;
}

export async function getConsensusValidators(blockIndex, opts = {}) {
  const index = Number(blockIndex);
  if (!Number.isSafeInteger(index) || index < 0) throw new Error("Invalid Neo X block index");

  const net = String(opts.net || "");
  const key = cacheKeyOf(net, index);
  const cached = readCache(key);
  if (cached) return cached;
  if (inflight.has(key)) return inflight.get(key);

  const request = rpcService
    .ethCall(
      { to: GOVERNANCE_ADDRESS, data: GET_CURRENT_CONSENSUS_SELECTOR },
      { net, blockTag: blockTagOf(index), timeoutMs: opts.timeoutMs ?? RPC_TIMEOUT_MS },
    )
    .then((result) => {
      const validators = Object.freeze(decodeAddressArrayResult(result));
      touchCache(key, validators);
      return validators;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, request);
  return request;
}

/**
 * Add primary-validator fields without making Blockscout availability depend
 * on the RPC node. Resolution failures leave the original blocks usable.
 */
export async function enrichBlocksWithConsensus(blocks, opts = {}) {
  if (!Array.isArray(blocks) || blocks.length === 0 || opts.signal?.aborted) return blocks || [];

  const groups = new Map();
  for (const block of blocks) {
    if (!Number.isSafeInteger(block?.index) || block.index < 0) continue;
    const epoch = epochOf(block.index);
    const existing = groups.get(epoch);
    if (!existing || block.index > existing) groups.set(epoch, block.index);
  }

  const validatorsByEpoch = new Map();
  await Promise.all(
    [...groups.entries()].map(async ([epoch, blockIndex]) => {
      try {
        const validators = await getConsensusValidators(blockIndex, opts);
        validatorsByEpoch.set(epoch, validators);
      } catch (_err) {
        validatorsByEpoch.set(epoch, null);
      }
    }),
  );

  if (opts.signal?.aborted) return blocks;
  return blocks.map((block) => {
    const validators = validatorsByEpoch.get(epochOf(block.index)) || null;
    const primaryIndex = Number.isSafeInteger(block.primaryIndex) ? block.primaryIndex : null;
    const primaryValidator = validators && primaryIndex !== null ? validators[primaryIndex] || null : null;
    return {
      ...block,
      primaryValidator,
      primaryPosition: primaryIndex === null ? null : primaryIndex + 1,
      consensusSize: validators?.length ?? null,
      consensusResolved: Boolean(primaryValidator),
    };
  });
}

export function clearConsensusCache() {
  consensusCache.clear();
  inflight.clear();
}

export const consensusService = {
  getConsensusValidators,
  enrichBlocksWithConsensus,
  clearConsensusCache,
};

export default consensusService;
