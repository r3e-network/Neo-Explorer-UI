import { hexToBase64, isPublicKeyHex, publicKeyToAddress, strip0x } from "@/utils/neoHelpers";

export function normalizeHex(value = "") {
  return strip0x(String(value || "").trim()).toLowerCase();
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
  if (!normalized || normalized.length % 2 !== 0 || /[^0-9a-f]/i.test(normalized)) {
    return [];
  }
  const pairs = normalized.match(/../g) || [];
  return pairs.map((pair) => Number.parseInt(pair, 16));
}

export function decodeSingleSignatureFromInvocationScript(invocationScript = "") {
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

export function encodePushDataHex(dataHex = "") {
  const normalized = normalizeHex(dataHex);
  if (!normalized || normalized.length % 2 !== 0 || /[^0-9a-f]/i.test(normalized)) {
    return "";
  }

  const byteLength = normalized.length / 2;
  if (byteLength <= 0xff) {
    return `0c${byteLength.toString(16).padStart(2, "0")}${normalized}`;
  }

  if (byteLength <= 0xffff) {
    const lenHex = byteLength.toString(16).padStart(4, "0");
    return `0d${lenHex.slice(2)}${lenHex.slice(0, 2)}${normalized}`;
  }

  if (byteLength <= 0xffffffff) {
    const lenHex = byteLength.toString(16).padStart(8, "0");
    return `0e${lenHex.slice(6)}${lenHex.slice(4, 6)}${lenHex.slice(2, 4)}${lenHex.slice(0, 2)}${normalized}`;
  }

  return "";
}

export function buildSignatureInvocationScriptHex(signatureHex = "") {
  return encodePushDataHex(signatureHex);
}

export function buildSignatureInvocationScriptBase64(signatureHex = "") {
  const invocationScriptHex = buildSignatureInvocationScriptHex(signatureHex);
  return invocationScriptHex ? hexToBase64(invocationScriptHex) : "";
}

export function resolveWitnessSignerAddress({ signerAddress = "", signerPublicKey = "" } = {}) {
  const explicitAddress = String(signerAddress || "").trim();
  const normalizedPublicKey = normalizeHex(signerPublicKey);

  if (explicitAddress) {
    return {
      signerAddress: explicitAddress,
      signerPublicKey: normalizedPublicKey || "",
    };
  }

  if (normalizedPublicKey && isPublicKeyHex(normalizedPublicKey)) {
    return {
      signerAddress: publicKeyToAddress(normalizedPublicKey),
      signerPublicKey: normalizedPublicKey,
    };
  }

  return {
    signerAddress: "",
    signerPublicKey: normalizedPublicKey || "",
  };
}

export function buildExternalWitnessPayload(
  {
    signerAddress = "",
    signerPublicKey = "",
    signatureHex = "",
    invocationScript = "",
    verificationScript = "",
    eligibleSigners = [],
    source = "external_witness",
  } = {}
) {
  const resolvedSigner = resolveWitnessSignerAddress({ signerAddress, signerPublicKey });
  if (!resolvedSigner.signerAddress) {
    throw new Error("Signer address or signer public key is required.");
  }

  if (resolvedSigner.signerPublicKey && isPublicKeyHex(resolvedSigner.signerPublicKey) && signerAddress) {
    const derivedAddress = publicKeyToAddress(resolvedSigner.signerPublicKey);
    if (derivedAddress && derivedAddress !== String(signerAddress).trim()) {
      throw new Error("Signer address does not match the provided public key.");
    }
  }

  if (Array.isArray(eligibleSigners) && eligibleSigners.length > 0 && !eligibleSigners.includes(resolvedSigner.signerAddress)) {
    throw new Error("Signer is not part of the eligible council signer set.");
  }

  const normalizedSignature = normalizeHex(signatureHex);
  const normalizedInvocationScript = normalizeHex(invocationScript);
  const normalizedVerificationScript = normalizeHex(verificationScript);

  const extractedSignature = decodeSingleSignatureFromInvocationScript(normalizedInvocationScript);
  const finalSignature = normalizedSignature || extractedSignature;

  if (!finalSignature || finalSignature.length < 128) {
    throw new Error("A valid 64-byte signature or decodable invocation script is required.");
  }

  if (normalizedSignature && extractedSignature && normalizedSignature !== extractedSignature) {
    throw new Error("The provided signature does not match the invocation script.");
  }

  const finalInvocationScript =
    normalizedInvocationScript ||
    buildSignatureInvocationScriptHex(finalSignature);

  return {
    signerAddress: resolvedSigner.signerAddress,
    publicKey: resolvedSigner.signerPublicKey || undefined,
    signature: finalSignature,
    invocationScript: finalInvocationScript || undefined,
    verificationScript: normalizedVerificationScript || undefined,
    witness: {
      signer_address: resolvedSigner.signerAddress,
      signature: finalSignature,
      ...(resolvedSigner.signerPublicKey ? { public_key: resolvedSigner.signerPublicKey } : {}),
      ...(finalInvocationScript ? { invocation_script: finalInvocationScript } : {}),
      ...(normalizedVerificationScript ? { verification_script: normalizedVerificationScript } : {}),
      source,
    },
  };
}
