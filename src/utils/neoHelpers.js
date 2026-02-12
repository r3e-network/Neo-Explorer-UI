import bs58 from "bs58";
import { sha256 } from "ethereum-cryptography/sha256";

const ADDRESS_VERSION = 0x35;

export function strip0x(value = "") {
  return String(value).replace(/^0x/i, "");
}

export function isScriptHashHex(value = "") {
  const normalized = strip0x(value);
  return /^[0-9a-fA-F]{40}$/.test(normalized);
}

export function isPublicKeyHex(value = "") {
  const normalized = strip0x(value);
  return /^(02|03)[0-9a-fA-F]{64}$/.test(normalized) || /^04[0-9a-fA-F]{128}$/.test(normalized);
}

export function reverseHex(value = "") {
  const normalized = strip0x(value);

  if (!normalized || normalized.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(normalized)) {
    return "";
  }

  const bytes = normalized.match(/../g);
  if (!bytes) return "";

  return bytes.reverse().join("");
}

export function hexToBytes(value = "") {
  const normalized = strip0x(value);

  if (!normalized || normalized.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(normalized)) {
    return new Uint8Array();
  }

  const bytes = new Uint8Array(normalized.length / 2);

  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
  }

  return bytes;
}

export function bytesToHex(bytes = new Uint8Array()) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function base64ToBytes(base64 = "") {
  if (!base64) return new Uint8Array();

  try {
    if (typeof atob === "function") {
      const binary = atob(base64);
      return Uint8Array.from(binary, (char) => char.charCodeAt(0));
    }

    if (typeof Buffer !== "undefined") {
      return Uint8Array.from(Buffer.from(base64, "base64"));
    }
  } catch {
    return new Uint8Array();
  }

  return new Uint8Array();
}

export function bytesToBase64(bytes = new Uint8Array()) {
  if (!bytes.length) return "";

  if (typeof btoa === "function") {
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  return "";
}

export function base64ToHex(base64 = "") {
  return bytesToHex(base64ToBytes(base64));
}

export function hexToBase64(hex = "") {
  return bytesToBase64(hexToBytes(hex));
}

export function bytesToUtf8(bytes = new Uint8Array()) {
  if (!bytes.length) return "";

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return "";
  }
}

export function scriptHashHexToAddress(scriptHashHex = "") {
  const normalized = strip0x(scriptHashHex).toLowerCase();

  if (!isScriptHashHex(normalized)) {
    return "";
  }

  const scriptHashBigEndian = reverseHex(normalized);
  const scriptHashBytes = hexToBytes(scriptHashBigEndian);

  if (scriptHashBytes.length !== 20) {
    return "";
  }

  const payload = new Uint8Array(1 + scriptHashBytes.length);
  payload[0] = ADDRESS_VERSION;
  payload.set(scriptHashBytes, 1);

  const checksum = sha256(sha256(payload)).slice(0, 4);
  const result = new Uint8Array(payload.length + checksum.length);
  result.set(payload);
  result.set(checksum, payload.length);

  return bs58.encode(result);
}

export function scriptHashBase64ToAddress(base64ScriptHash = "") {
  const scriptHashHexLittleEndian = base64ToHex(base64ScriptHash);

  if (scriptHashHexLittleEndian.length !== 40) {
    return "";
  }

  const scriptHashHexBigEndian = reverseHex(scriptHashHexLittleEndian);
  if (!scriptHashHexBigEndian) return "";

  return scriptHashHexToAddress(scriptHashHexBigEndian);
}
