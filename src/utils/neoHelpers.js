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

/**
 * Resolve an IPFS / data URI to a displayable HTTPS URL.
 * @param {string} raw - Raw image URL (ipfs://, ipfs-video://, https://, data:image/*)
 * @returns {string} Resolved URL or empty string
 */
export function resolveImageUrl(raw) {
  if (!raw) return "";
  let url = raw;
  if (url.startsWith("ipfs")) {
    url = url.replace(/^(ipfs:\/\/)|^(ipfs-video:\/\/)/, "https://ipfs.io/ipfs/");
  }
  if (url.startsWith("https://")) return url;
  if (url.startsWith("data:image/") && !url.startsWith("data:image/svg")) return url;
  return "";
}

// ---------------------------------------------------------------------------
// Migrated from @/store/util — kept here so every consumer imports from one
// canonical location.
// ---------------------------------------------------------------------------

function numFormat(num) {
  const parts = num.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export function convertToken(token, decimal) {
  const num = Number(token);
  if (!Number.isFinite(num)) return "0";
  return numFormat(parseFloat((num * Math.pow(10, -(decimal || 0))).toFixed(8)));
}

export function scriptHashToAddress(hash) {
  if (!hash || typeof hash !== "string") return "";
  return scriptHashHexToAddress(hash) || hash;
}

export function responseConverter(_key, val) {
  if (typeof val === "object" && val !== null) {
    if (val["type"] === "ByteString" && typeof val["value"] === "string") {
      const bytes = base64ToBytes(val["value"]);
      const hex = bytesToHex(bytes);
      if (isPublicKeyHex(hex)) {
        return { ...val, type: "PublicKey", value: "0x" + hex };
      } else if (isScriptHashHex(hex)) {
        const reversed = reverseHex(hex);
        return { ...val, type: "ScriptHash", value: reversed ? "0x" + reversed : "0x" + hex };
      } else if (hex && /^([0-9a-f]{64})$/i.test(hex)) {
        return { ...val, type: "ScriptHash", value: "0x" + hex };
      } else {
        const text = bytesToUtf8(bytes);
        if (text && /^[\x20-\x7F]*$/.test(text)) {
          return { ...val, type: "String", value: text };
        } else {
          return { ...val, type: "HexString", value: hex };
        }
      }
    } else if (val["type"] === "Buffer" && typeof val["value"] === "string") {
      const bytes = base64ToBytes(val["value"]);
      const hex = bytesToHex(bytes);
      const text = bytesToUtf8(bytes);
      if (text && /^[\x20-\x7F]*$/.test(text)) {
        return { ...val, type: "String", value: text };
      } else {
        const parsed = Number.parseInt(hex || "0", 16);
        return { ...val, type: "BigInteger", value: Number.isFinite(parsed) ? parsed : 0 };
      }
    }
  }
  return val;
}
