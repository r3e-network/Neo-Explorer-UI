const { callWithRpcEndpointFallback, normalizeNetwork } = require("./rpcEndpoints");

function normalizeHex(value = "") {
  return String(value || "").trim().replace(/^0x/i, "").toLowerCase();
}

function readPushDataLength(bytes, opcode) {
  if (opcode === 0x0c && bytes.length >= 2) {
    return { headerSize: 2, dataSize: bytes[1] };
  }
  if (opcode === 0x0d && bytes.length >= 3) {
    return { headerSize: 3, dataSize: bytes[1] | (bytes[2] << 8) };
  }
  if (opcode === 0x0e && bytes.length >= 5) {
    return {
      headerSize: 5,
      dataSize: bytes[1] | (bytes[2] << 8) | (bytes[3] << 16) | (bytes[4] << 24),
    };
  }
  if (opcode >= 0x01 && opcode <= 0x4b) {
    return { headerSize: 1, dataSize: opcode };
  }
  return null;
}

function bytesFromHex(value = "") {
  const normalized = normalizeHex(value);
  if (!normalized || normalized.length % 2 !== 0 || /[^0-9a-f]/i.test(normalized)) return [];
  return (normalized.match(/../g) || []).map((pair) => Number.parseInt(pair, 16));
}

function decodeSingleSignatureFromInvocationScript(invocationScript = "") {
  const normalized = normalizeHex(invocationScript);
  const bytes = bytesFromHex(normalized);
  if (!bytes.length) return "";

  const lengthInfo = readPushDataLength(bytes, bytes[0]);
  if (!lengthInfo) return "";

  const { headerSize, dataSize } = lengthInfo;
  if (bytes.length !== headerSize + dataSize) return "";

  const dataBytes = bytes.slice(headerSize);
  const signatureHex = dataBytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return signatureHex.length >= 128 ? signatureHex : "";
}

function buildSignatureInvocationScriptHex(signatureHex = "") {
  const normalized = normalizeHex(signatureHex);
  if (!normalized || normalized.length !== 128 || /[^0-9a-f]/i.test(normalized)) return "";
  return `0c40${normalized}`;
}

function resolveCommitteePubkeys(requestRow = {}) {
  const params = requestRow?.params && typeof requestRow.params === "object" ? requestRow.params : {};
  const candidates = [
    params.committee_pubkeys,
    params.committee,
    params.pubkeys,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate.map((value) => normalizeHex(value)).filter(Boolean);
    }
  }

  return [];
}

function resolveRequestNetwork(requestRow = {}) {
  return normalizeNetwork(
    requestRow.network ||
      requestRow.network_mode ||
      requestRow?.params?.network ||
      "mainnet",
  );
}

async function loadNeon() {
  return import("@cityofzion/neon-js");
}

async function computeSigningPayload(unsignedTxHex, networkMode) {
  const neon = await loadNeon();
  const versionRes = await callWithRpcEndpointFallback(networkMode, async (endpoint) => {
    const client = new neon.rpc.RPCClient(endpoint);
    return client.getVersion();
  });

  const networkMagic = Number(versionRes?.protocol?.network);
  if (!Number.isFinite(networkMagic)) {
    throw new Error("Failed to resolve network magic for governance signature verification.");
  }

  const transaction = neon.tx.Transaction.deserialize(unsignedTxHex);
  const transactionHash = normalizeHex(transaction?.hash?.());
  if (!transactionHash) {
    throw new Error("Failed to resolve governance transaction hash.");
  }

  return {
    payload: neon.u.num2hexstring(networkMagic, 4, true) + neon.u.reverseHex(transactionHash),
    transactionHash,
    networkMagic,
  };
}

async function verifyGovernanceWitness({ requestRow, signerAddress, publicKey, signature, invocationScript, verificationScript }) {
  const unsignedTxHex = String(requestRow?.params?.unsigned_tx || "").trim();
  if (!unsignedTxHex) {
    throw new Error("Request is missing unsigned_tx.");
  }

  const normalizedPublicKey = normalizeHex(publicKey);
  const normalizedSignature = normalizeHex(signature);
  const normalizedInvocationScript = normalizeHex(invocationScript);
  const normalizedVerificationScript = normalizeHex(verificationScript);

  if (!normalizedSignature || normalizedSignature.length !== 128) {
    throw new Error("Valid signature is required.");
  }

  const committeePubkeys = resolveCommitteePubkeys(requestRow);
  const neon = await loadNeon();

  const derivedSignature = normalizedInvocationScript
    ? decodeSingleSignatureFromInvocationScript(normalizedInvocationScript)
    : "";
  if (derivedSignature && derivedSignature !== normalizedSignature) {
    throw new Error("Invocation script does not match the submitted signature.");
  }

  let canonicalPublicKey = normalizedPublicKey;
  let canonicalAddress = String(signerAddress || "").trim();

  if (!canonicalPublicKey) {
    canonicalPublicKey = committeePubkeys.find((pubkey) => {
      try {
        return new neon.wallet.Account(pubkey).address === canonicalAddress;
      } catch {
        return false;
      }
    }) || "";
  }

  if (!canonicalPublicKey) {
    throw new Error("Signer public key is required for server-side verification.");
  }

  if (!committeePubkeys.length) {
    throw new Error("Committee pubkeys not available for this proposal.");
  }
  if (!committeePubkeys.includes(canonicalPublicKey)) {
    throw new Error("Signer public key is not part of the committee for this proposal.");
  }

  const signerAccount = new neon.wallet.Account(canonicalPublicKey);
  const derivedAddress = String(signerAccount.address || "").trim();
  if (!derivedAddress) {
    throw new Error("Failed to derive signer address from the provided public key.");
  }

  if (canonicalAddress && canonicalAddress !== derivedAddress) {
    throw new Error("Signer address does not match the provided public key.");
  }

  canonicalAddress = derivedAddress;

  const networkMode = resolveRequestNetwork(requestRow);
  const { payload, transactionHash, networkMagic } = await computeSigningPayload(unsignedTxHex, networkMode);
  const isValid = neon.wallet.verify(payload, normalizedSignature, canonicalPublicKey);
  if (!isValid) {
    console.error("[governanceSignature] Verification FAILED", JSON.stringify({
      networkMode,
      networkMagic,
      transactionHash,
      payload,
      publicKey: canonicalPublicKey,
      signaturePrefix: normalizedSignature.slice(0, 32),
      unsignedTxPrefix: unsignedTxHex.slice(0, 40),
    }));
    throw new Error("Signature does not match the governance signing payload for this signer.");
  }

  const expectedInvocationScript = buildSignatureInvocationScriptHex(normalizedSignature);
  const expectedVerificationScript = normalizeHex(signerAccount?.contract?.script || "");

  if (normalizedVerificationScript && expectedVerificationScript && normalizedVerificationScript !== expectedVerificationScript) {
    throw new Error("Verification script does not match the signer public key.");
  }

  return {
    signerAddress: canonicalAddress,
    publicKey: canonicalPublicKey,
    signature: normalizedSignature,
    invocationScript: normalizedInvocationScript || expectedInvocationScript,
    verificationScript: normalizedVerificationScript || expectedVerificationScript,
  };
}

module.exports = {
  resolveCommitteePubkeys,
  resolveRequestNetwork,
  verifyGovernanceWitness,
};
