/**
 * Neo N3 data type decoding utilities.
 *
 * Decodes NeoVM stack items (ByteString, Integer, Hash160, etc.)
 * into human-readable values. Uses neon-js for address conversion.
 *
 * @module utils/neoCodec
 */
import Neon from "@cityofzion/neon-js";

/**
 * Convert a base64-encoded 20-byte script hash to a Neo N3 address (N...).
 * @param {string} base64ScriptHash - Base64-encoded script hash
 * @returns {string|null} Neo N3 address or null on failure
 */
export function scriptHashToAddress(base64ScriptHash) {
  if (!base64ScriptHash) return null;
  try {
    const raw = atob(base64ScriptHash);
    if (raw.length !== 20) return null;
    const hex = Array.from(raw, (c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
    const reversed = Neon.u.reverseHex(hex);
    const account = Neon.create.account("0x" + reversed);
    return account.address;
  } catch {
    return null;
  }
}

/**
 * Convert a base64 ByteString to 0x-prefixed hex.
 * @param {string} base64Str
 * @returns {string}
 */
export function base64ToHex(base64Str) {
  if (!base64Str) return "";
  try {
    const raw = atob(base64Str);
    return "0x" + Array.from(raw, (c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
  } catch {
    return base64Str;
  }
}

/**
 * Try to decode base64 as readable UTF-8. Returns null if not printable.
 * @param {string} base64Str
 * @returns {string|null}
 */
export function base64ToUtf8(base64Str) {
  if (!base64Str) return null;
  try {
    const raw = atob(base64Str);
    if (raw.length === 0) return null;
    const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    // Reject if contains control chars (0x00-0x1F except tab/newline/cr, 0x7F)
    for (const b of bytes) {
      if (b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d) return null;
      if (b === 0x7f) return null;
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Check if a base64 string decodes to exactly 20 bytes (script hash).
 * @param {string} base64Str
 * @returns {boolean}
 */
export function isScriptHash(base64Str) {
  if (!base64Str) return false;
  try {
    return atob(base64Str).length === 20;
  } catch {
    return false;
  }
}

const MAX_DECODE_DEPTH = 10;

/**
 * Decode a single NeoVM stack item into a structured result.
 * @param {Object} stackItem - { type, value } from application log
 * @param {number} depth - Current recursion depth (internal use)
 * @returns {{ type: string, rawValue: *, decodedValue: string, displayValue: string }}
 */
export function decodeStackItem(stackItem, depth = 0) {
  if (!stackItem) return { type: "Any", rawValue: null, decodedValue: "null", displayValue: "null" };

  if (depth >= MAX_DECODE_DEPTH) {
    return {
      type: stackItem.type ?? "Any",
      rawValue: stackItem.value,
      decodedValue: "[truncated]",
      displayValue: "[truncated]",
    };
  }

  const { type, value } = stackItem;
  const result = { type, originalType: type, rawValue: value, decodedValue: "", displayValue: "" };

  switch (type) {
    case "Integer":
      result.decodedValue = String(value ?? "0");
      result.displayValue = result.decodedValue;
      break;

    case "Boolean":
      result.decodedValue = value ? "true" : "false";
      result.displayValue = result.decodedValue;
      break;

    case "ByteString": {
      if (!value) {
        result.decodedValue = "null";
        result.displayValue = "null";
        break;
      }
      // Try as Neo address (20-byte script hash)
      if (isScriptHash(value)) {
        const addr = scriptHashToAddress(value);
        if (addr) {
          result.type = "Hash160";
          result.decodedValue = addr;
          result.displayValue = addr;
          break;
        }
      }
      // Try as readable UTF-8
      const utf8 = base64ToUtf8(value);
      if (utf8) {
        result.decodedValue = utf8;
        result.displayValue = utf8;
        break;
      }
      // Fallback to hex
      result.decodedValue = base64ToHex(value);
      result.displayValue = result.decodedValue;
      break;
    }

    case "Hash160": {
      const addr = value ? scriptHashToAddress(value) : null;
      result.decodedValue = addr || base64ToHex(value);
      result.displayValue = result.decodedValue;
      break;
    }

    case "Array":
    case "Struct":
      if (Array.isArray(value)) {
        const items = value.map((v) => decodeStackItem(v, depth + 1));
        result.decodedValue = items.map((i) => i.displayValue).join(", ");
        result.displayValue = `[${result.decodedValue}]`;
      } else {
        result.decodedValue = String(value);
        result.displayValue = result.decodedValue;
      }
      break;

    case "Map":
      if (Array.isArray(value)) {
        const entries = value.map((entry) => {
          const k = decodeStackItem(entry.key, depth + 1);
          const v = decodeStackItem(entry.value, depth + 1);
          return `${k.displayValue}: ${v.displayValue}`;
        });
        result.decodedValue = entries.join(", ");
        result.displayValue = `{${result.decodedValue}}`;
      } else {
        result.decodedValue = String(value);
        result.displayValue = result.decodedValue;
      }
      break;

    case "Buffer": {
      const hex = value ? base64ToHex(value) : "";
      result.decodedValue = hex;
      result.displayValue = `Buffer(${hex})`;
      break;
    }

    case "Pointer":
      result.decodedValue = String(value ?? "0");
      result.displayValue = `Pointer(${result.decodedValue})`;
      break;

    case "InteropInterface":
      result.decodedValue = String(value ?? "");
      result.displayValue = `InteropInterface(${result.decodedValue})`;
      break;

    default:
      result.decodedValue = String(value ?? "");
      result.displayValue = result.decodedValue;
  }

  return result;
}

/**
 * Decode notification state params using optional ABI event definition.
 * Falls back to indexed display when no ABI is available.
 * @param {Object} state - Notification state ({ type: "Array", value: [...] })
 * @param {Object|null} eventDef - ABI event definition with parameters array
 * @returns {Array<{ index: number, name: string|null, type: string, decoded: Object }>}
 */
export function decodeNotificationParams(state, eventDef = null) {
  if (!state) return [];
  // Handle malformed state: state.value could be null, or state itself could be an array
  const rawItems = state.value ?? (Array.isArray(state) ? state : []);
  if (!Array.isArray(rawItems)) return [];
  const abiParams = eventDef?.parameters ?? [];

  return rawItems.map((item, i) => {
    const decoded = decodeStackItem(item);
    const abiParam = abiParams[i];
    return {
      index: i,
      name: abiParam?.name ?? null,
      type: decoded.type,
      decoded,
    };
  });
}
