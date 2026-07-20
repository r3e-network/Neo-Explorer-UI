// Neo X Anti-MEV Envelope metadata that is safe to derive from public chain data.

export const NEOX_GOV_REWARD_ADDRESS = "0x1212000000000000000000000000000000000003";
export const NEOX_ENVELOPE_PREFIX = "0xffffffff";

const PREFIX_BYTES = 4;
const ROUND_BYTES = 4;
const GAS_BYTES = 4;
const HASH_BYTES = 32;
const TPKE_KEY_BYTES = 48 + 48 + 96;
const MIN_ENCRYPTED_MESSAGE_BYTES = 112;
const HEADER_BYTES = PREFIX_BYTES + ROUND_BYTES + GAS_BYTES + HASH_BYTES;
const MIN_ENVELOPE_BYTES = HEADER_BYTES + TPKE_KEY_BYTES + MIN_ENCRYPTED_MESSAGE_BYTES;

export const NEOX_ANTI_MEV_DOCS_URL =
  "https://xdocs.ngd.network/security/anti-mev-protection";
export const NEOX_ANTI_MEV_SENDER_URL = "https://neox-tpke-examples.pages.dev";

const NETWORK_PROFILES = Object.freeze({
  "neox-mainnet": Object.freeze({
    activationHeight: 3_749_760,
    activationVersion: "v0.4.2",
  }),
  "neox-testnet": Object.freeze({
    activationHeight: 2_088_000,
    activationVersion: "TestNet upgrade",
  }),
});

function normalizeHex(value) {
  const raw = String(value || "").trim();
  if (!/^0x[0-9a-f]*$/i.test(raw) || (raw.length - 2) % 2 !== 0) return null;
  return raw.toLowerCase();
}
function uint32At(hex, byteOffset) {
  const start = 2 + byteOffset * 2;
  const chunk = hex.slice(start, start + 8);
  return chunk.length === 8 ? Number.parseInt(chunk, 16) : null;
}

function bytesLabel(count) {
  return Number.isFinite(count) && count >= 0 ? count : null;
}

/**
 * Parse the cleartext metadata of an Envelope without attempting TPKE
 * decryption or cryptographic point validation.
 */
export function parseNeoxEnvelopeData(rawInput) {
  const data = normalizeHex(rawInput);
  if (!data || !data.startsWith(NEOX_ENVELOPE_PREFIX)) return null;

  const totalBytes = (data.length - 2) / 2;
  const dkgRound = uint32At(data, PREFIX_BYTES);
  const encryptedGas = uint32At(data, PREFIX_BYTES + ROUND_BYTES);
  const hashStart = 2 + (PREFIX_BYTES + ROUND_BYTES + GAS_BYTES) * 2;
  const hashHex = data.slice(hashStart, hashStart + HASH_BYTES * 2);
  const issues = [];

  if (totalBytes < MIN_ENVELOPE_BYTES) issues.push("Envelope payload is shorter than the protocol minimum.");
  if (!Number.isFinite(dkgRound) || dkgRound <= 0) issues.push("DKG round must be greater than zero.");
  if (!Number.isFinite(encryptedGas) || encryptedGas < 21_000) issues.push("Reserved gas is below the protocol minimum.");
  if (hashHex.length !== HASH_BYTES * 2) issues.push("Inner transaction commitment is incomplete.");

  const encryptedMessageBytes = Math.max(0, totalBytes - HEADER_BYTES - TPKE_KEY_BYTES);

  return {
    isEnvelope: true,
    isStructurallyValid: issues.length === 0,
    issues,
    dkgRound,
    encryptedGas,
    innerTransactionHash: hashHex.length === HASH_BYTES * 2 ? `0x${hashHex}` : null,
    totalBytes: bytesLabel(totalBytes),
    encryptedKeyBytes: totalBytes >= HEADER_BYTES + TPKE_KEY_BYTES ? TPKE_KEY_BYTES : null,
    encryptedMessageBytes: bytesLabel(encryptedMessageBytes),
    encryptedPayloadBytes: bytesLabel(Math.max(0, totalBytes - HEADER_BYTES)),
  };
}

/** Identify a public transaction that still carries an outer Envelope. */
export function analyzeNeoxAntiMevTransaction(transaction) {
  if (!transaction || typeof transaction !== "object") return null;
  const target = String(transaction.toInfo?.hash || transaction.to || transaction.raw?.to?.hash || "").toLowerCase();
  if (target !== NEOX_GOV_REWARD_ADDRESS) return null;

  const txType = Number(transaction.txType ?? transaction.type ?? transaction.raw?.type);
  if (txType === 3 || txType === 4) return null;

  const parsed = parseNeoxEnvelopeData(transaction.rawInput ?? transaction.raw_input ?? transaction.raw?.raw_input);
  if (!parsed) return null;

  return {
    ...parsed,
    target: NEOX_GOV_REWARD_ADDRESS,
    canonicalRecord: transaction.blockIndex !== undefined && transaction.blockIndex !== null,
  };
}

export function getNeoxAntiMevProfile(net) {
  const key = String(net || "").toLowerCase().includes("test") ? "neox-testnet" : "neox-mainnet";
  return { net: key, ...NETWORK_PROFILES[key] };
}

export function getNeoxBlockProtection(blockHeight, net) {
  const profile = getNeoxAntiMevProfile(net);
  const height = Number(blockHeight);
  const knownHeight = Number.isFinite(height) && height >= 0;
  return {
    ...profile,
    blockHeight: knownHeight ? height : null,
    active: knownHeight ? height >= profile.activationHeight : null,
    preBlockName: "PreBlock / Shadow Block",
    consensusPhase: "PreCommit",
    finality: "Single-block finality",
  };
}
