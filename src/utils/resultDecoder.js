import {
  base64ToBytes,
  bytesToHex,
  bytesToUtf8,
  isScriptHashHex,
  isPublicKeyHex,
  reverseHex,
  scriptHashHexToAddress,
} from "./neoHelpers";

/**
 * Decode a single NeoVM stack item into human-readable form.
 * @param {Object} item - { type, value } from RPC response stack
 * @returns {{ type: string, value: any, raw: any }}
 */
export function decodeStackItem(item) {
  if (!item || typeof item !== "object") return { type: "Any", value: null, raw: item };

  const { type, value } = item;

  if (type === "Boolean") return { type: "Boolean", value: Boolean(value), raw: value };

  if (type === "Integer") return { type: "Integer", value: String(value ?? "0"), raw: value };

  if (type === "ByteString" || type === "Buffer") {
    const bytes = base64ToBytes(value || "");
    const hex = bytesToHex(bytes);

    if (bytes.length === 20 && isScriptHashHex(hex)) {
      const bigEndian = reverseHex(hex);
      const address = scriptHashHexToAddress(bigEndian);
      return { type: "Address", value: address || "0x" + bigEndian, raw: value, hex };
    }
    if (isPublicKeyHex(hex)) {
      return { type: "PublicKey", value: "0x" + hex, raw: value };
    }
    const text = bytesToUtf8(bytes);
    if (text && /^[\x20-\x7E]*$/.test(text)) {
      return { type: "String", value: text, raw: value, hex };
    }
    return { type: "Hex", value: hex || "(empty)", raw: value };
  }

  if (type === "Array" && Array.isArray(value)) {
    return { type: "Array", value: value.map(decodeStackItem), raw: value };
  }

  if (type === "Map" && Array.isArray(value)) {
    return {
      type: "Map",
      value: value.map((entry) => ({
        key: decodeStackItem(entry.key),
        value: decodeStackItem(entry.value),
      })),
      raw: value,
    };
  }

  if (type === "Any" || type === "Void") return { type: "Void", value: null, raw: value };

  return { type: type || "Unknown", value: value ?? null, raw: value };
}

/**
 * Decode full RPC invokefunction response.
 * @param {Object} rpcResult - Raw RPC result with { state, gasconsumed, stack, exception }
 * @returns {{ state: string, gasConsumed: string, stack: Array, exception: string|null }}
 */
export function decodeInvokeResult(rpcResult) {
  if (!rpcResult) return { state: "UNKNOWN", gasConsumed: "0", stack: [], exception: null };
  return {
    state: rpcResult.state || "UNKNOWN",
    gasConsumed: rpcResult.gasconsumed || rpcResult.gas_consumed || "0",
    stack: Array.isArray(rpcResult.stack) ? rpcResult.stack.map(decodeStackItem) : [],
    exception: rpcResult.exception || null,
  };
}
