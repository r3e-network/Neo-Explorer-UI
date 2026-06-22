let neoSdkPromise = null;

function loadNeoSdk() {
  if (!neoSdkPromise) {
    neoSdkPromise = import("@r3e/neo-js-sdk");
  }
  return neoSdkPromise;
}

function stableStringify(value) {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function normalizeHex(value = "") {
  return String(value || "").trim().replace(/^0x/i, "").toLowerCase();
}

function normalizeSignatureHex(value = "") {
  const raw = String(value || "").trim();
  const normalized = normalizeHex(raw);
  if (/^[0-9a-f]{128}$/i.test(normalized)) return normalized;
  if (!raw || /\s/.test(raw) || !/^[A-Za-z0-9+/=]+$/.test(raw)) return "";
  try {
    const decoded = Buffer.from(raw, "base64").toString("hex");
    return /^[0-9a-f]{128}$/i.test(decoded) ? decoded.toLowerCase() : "";
  } catch {
    return "";
  }
}

function buildMultisigMutationMessage({
  requestId,
  network = "",
  status = "",
  broadcastTxHash = "",
  broadcastAt = "",
  metadata = null,
  signedAt = 0,
} = {}) {
  // `Signed At` (a client-supplied unix-ms timestamp) is part of the signed
  // payload so the signature is bound to a moment in time. The server rejects
  // stale timestamps and records the signature as single-use, which together
  // prevent a captured mutation signature from being replayed to roll proposal
  // state backward. v2 because adding this line changes the canonical message.
  return [
    "Neo Explorer Multisig Mutation v2",
    `Request ID: ${Number(requestId) || 0}`,
    `Network: ${String(network || "").trim().toLowerCase()}`,
    `Status: ${String(status || "").trim()}`,
    `Broadcast TX: ${String(broadcastTxHash || "").trim().toLowerCase()}`,
    `Broadcast At: ${String(broadcastAt || "").trim()}`,
    `Metadata: ${stableStringify(metadata ?? null)}`,
    `Signed At: ${Number(signedAt) || 0}`,
  ].join("\n");
}

function normalizePublicKey(publicKey = "") {
  const value = normalizeHex(publicKey);
  if (/^(02|03)[0-9a-f]{64}$|^04[0-9a-f]{128}$/i.test(value)) return value;
  return "";
}

async function addressFromPublicKey(publicKey) {
  const { PublicKey } = await loadNeoSdk();
  return new PublicKey(publicKey).getAddress();
}

async function resolveSignerPublicKey({ signerAddress, publicKey, committeePubkeys = [] }) {
  const normalizedSigner = String(signerAddress || "").trim();
  const explicit = normalizePublicKey(publicKey);
  if (explicit) {
    const derived = await addressFromPublicKey(explicit);
    if (derived !== normalizedSigner) {
      throw new Error("Mutation public key does not match signer_address.");
    }
    return explicit;
  }

  const candidates = Array.isArray(committeePubkeys) ? committeePubkeys : [];
  for (const candidate of candidates) {
    const normalized = normalizePublicKey(candidate);
    if (!normalized) continue;
    try {
      if ((await addressFromPublicKey(normalized)) === normalizedSigner) {
        return normalized;
      }
    } catch {
      // Try the next committee key.
    }
  }
  return "";
}

async function verifyMultisigMutationAuthorization({
  signerAddress,
  publicKey,
  signature,
  message,
  committeePubkeys = [],
  creatorAddress = "",
} = {}) {
  const normalizedSigner = String(signerAddress || "").trim();
  if (!normalizedSigner) {
    throw new Error("signer_address is required to mutate a multisig request.");
  }
  const normalizedSignature = normalizeSignatureHex(signature);
  if (!normalizedSignature) {
    throw new Error("Valid mutation signature is required.");
  }

  const signerPublicKey = await resolveSignerPublicKey({
    signerAddress: normalizedSigner,
    publicKey,
    committeePubkeys,
  });
  if (!signerPublicKey) {
    throw new Error("Signer public key could not be resolved from the proposal committee.");
  }

  const { PublicKey, hexToBytes, str2hexstring } = await loadNeoSdk();
  const verified = new PublicKey(signerPublicKey).verify(
    hexToBytes(str2hexstring(message)),
    hexToBytes(normalizedSignature),
  );
  if (!verified) {
    throw new Error("Mutation signature does not match the requested update.");
  }

  const committeeSet = new Set((Array.isArray(committeePubkeys) ? committeePubkeys : []).map(normalizePublicKey).filter(Boolean));
  const isCreator = !!creatorAddress && normalizedSigner === String(creatorAddress || "").trim();
  const isCommittee = committeeSet.has(signerPublicKey);
  if (!isCreator && !isCommittee) {
    throw new Error("Signer is not authorized to mutate this proposal.");
  }

  // Return the normalized signature so the caller can use it as a stable
  // single-use key (base64 and hex forms of the same signature collapse here).
  return { signerAddress: normalizedSigner, publicKey: signerPublicKey, signature: normalizedSignature };
}

module.exports = {
  buildMultisigMutationMessage,
  stableStringify,
  verifyMultisigMutationAuthorization,
  _internal: {
    normalizeSignatureHex,
    resolveSignerPublicKey,
  },
};
