/**
 * NeoVM Script Disassembler
 * @module utils/scriptDisassembler
 * @description Parses base64-encoded NeoVM scripts into human-readable opcode sequences
 */
import { OPCODES, SYSCALL_HASHES } from "./neoOpcodes";

/**
 * Decode a base64 string to a Uint8Array.
 * @param {string} b64 - Base64-encoded string
 * @returns {Uint8Array}
 */
function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert bytes to hex string.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Read a little-endian unsigned integer from bytes.
 * @param {Uint8Array} bytes
 * @param {number} offset
 * @param {number} size - 1, 2, or 4
 * @returns {number}
 */
function readUIntLE(bytes, offset, size) {
  let val = 0;
  for (let i = 0; i < size; i++) {
    val |= (bytes[offset + i] || 0) << (8 * i);
  }
  return val >>> 0;
}

/**
 * Try to interpret bytes as a printable UTF-8 string.
 * @param {Uint8Array} bytes
 * @returns {string|null} - Readable string or null
 */
function tryUtf8(bytes) {
  if (bytes.length === 0) return null;
  try {
    const str = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    // Only return if mostly printable ASCII
    if (/^[\x20-\x7e]+$/.test(str)) return str;
  } catch {
    // not valid UTF-8
  }
  return null;
}

/**
 * Format operand data for display based on opcode context.
 * @param {Object} opDef - Opcode definition from OPCODES
 * @param {Uint8Array} operandBytes - Raw operand bytes
 * @returns {string} - Human-readable operand
 */
function formatOperand(opDef, operandBytes) {
  if (!operandBytes || operandBytes.length === 0) return "";

  const hex = bytesToHex(operandBytes);
  const name = opDef.name;

  // SYSCALL: resolve 4-byte hash to name
  if (name === "SYSCALL") {
    const syscallName = SYSCALL_HASHES[hex];
    return syscallName ? syscallName : `0x${hex}`;
  }

  // PUSHDATA: try UTF-8, then show hex with length
  if (name.startsWith("PUSHDATA")) {
    const utf8 = tryUtf8(operandBytes);
    if (utf8) return `"${utf8}"`;
    // 20-byte = likely script hash
    if (operandBytes.length === 20) return `0x${hex} (Hash160)`;
    // 32-byte = likely Hash256
    if (operandBytes.length === 32) return `0x${hex} (Hash256)`;
    return `0x${hex} (${operandBytes.length} bytes)`;
  }

  // Integer pushes
  if (name.startsWith("PUSHINT")) {
    // Read as little-endian signed integer
    if (operandBytes.length <= 4) {
      let val = readUIntLE(operandBytes, 0, operandBytes.length);
      // Sign extend for signed interpretation
      const bits = operandBytes.length * 8;
      if (val >= 1 << (bits - 1)) val -= 1 << bits;
      return String(val);
    }
    return `0x${hex}`;
  }

  // Jump offsets
  if (
    name.startsWith("JMP") ||
    name === "CALL" ||
    name === "CALL_L" ||
    name.startsWith("ENDTRY") ||
    name === "TRY" ||
    name === "TRY_L"
  ) {
    if (operandBytes.length <= 4) {
      let val = readUIntLE(operandBytes, 0, operandBytes.length);
      const bits = operandBytes.length * 8;
      if (val >= 1 << (bits - 1)) val -= 1 << bits;
      return val >= 0 ? `+${val}` : String(val);
    }
    return `0x${hex}`;
  }

  // CALLT: 2-byte token index
  if (name === "CALLT") {
    return `token#${readUIntLE(operandBytes, 0, 2)}`;
  }

  // Default: hex
  return `0x${hex}`;
}

/**
 * Disassemble a base64-encoded NeoVM script into instruction list.
 * @param {string} base64Script - Base64-encoded script
 * @returns {Array<{offset: number, opcode: string, operand: string, rawHex: string, desc: string}>}
 */
export function disassembleScript(base64Script) {
  if (!base64Script) return [];

  let bytes;
  try {
    bytes = base64ToBytes(base64Script);
  } catch {
    return [{ offset: 0, opcode: "ERROR", operand: "Invalid base64", rawHex: "", desc: "" }];
  }

  const instructions = [];
  let pos = 0;

  while (pos < bytes.length) {
    const startPos = pos;
    const byte = bytes[pos++];
    const opDef = OPCODES[byte];

    if (!opDef) {
      instructions.push({
        offset: startPos,
        opcode: `0x${byte.toString(16).padStart(2, "0")}`,
        operand: "",
        rawHex: byte.toString(16).padStart(2, "0"),
        desc: "Unknown opcode",
      });
      continue;
    }

    let operandBytes = null;
    let rawHex = byte.toString(16).padStart(2, "0");

    if (opDef.operandSize === -1) {
      // Variable-length: read prefix bytes for length
      const prefixSize = opDef.prefix || 1;
      if (pos + prefixSize > bytes.length) break;
      const dataLen = readUIntLE(bytes, pos, prefixSize);
      pos += prefixSize;
      if (pos + dataLen > bytes.length) break;
      operandBytes = bytes.slice(pos, pos + dataLen);
      rawHex += bytesToHex(bytes.slice(pos - prefixSize, pos + dataLen));
      pos += dataLen;
    } else if (opDef.operandSize > 0) {
      // Fixed-length operand
      if (pos + opDef.operandSize > bytes.length) break;
      operandBytes = bytes.slice(pos, pos + opDef.operandSize);
      rawHex += bytesToHex(operandBytes);
      pos += opDef.operandSize;
    }

    instructions.push({
      offset: startPos,
      opcode: opDef.name,
      operand: formatOperand(opDef, operandBytes),
      rawHex,
      desc: opDef.desc,
    });
  }

  return instructions;
}
