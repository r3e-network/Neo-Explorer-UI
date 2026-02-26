/**
 * NeoVM Script Disassembler
 * @module utils/scriptDisassembler
 * @description Parses base64-encoded NeoVM scripts into human-readable opcode sequences
 */
import { OPCODES, SYSCALL_HASHES } from "./neoOpcodes";
import { NEO_HASH, GAS_HASH, CONTRACT_MANAGEMENT_HASH } from "../constants";
import { scriptHashHexToAddress, publicKeyToAddress } from "./neoHelpers";
import { KNOWN_CONTRACTS } from "@/constants/knownContracts";

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

function reverseHexStr(hex) {
  let out = "";
  for (let i = hex.length - 2; i >= 0; i -= 2) {
    out += hex.substr(i, 2);
  }
  return out;
}

// Some networks/tools emit modern syscall IDs that are not present
// in the legacy static table.
const SYSCALL_HASH_FALLBACKS = {
  "0x627d5b52": "System.Contract.Call",
  "0x1af77b67": "System.Contract.CallNative",
  "0x56e7b327": "System.Crypto.CheckSig",
  "0x27b3e756": "System.Crypto.CheckSig",
};

function resolveSyscallName(hex) {
  const direct = String(hex || "")
    .trim()
    .toLowerCase()
    .replace(/^0x/, "")
    .replace(/[^a-f0-9]/g, "");
  if (!direct) return null;

  const reversed = reverseHexStr(direct).toLowerCase();
  const keys = [direct, `0x${direct}`, reversed, `0x${reversed}`];

  for (const key of keys) {
    const fromStatic = SYSCALL_HASHES[key];
    if (fromStatic) return fromStatic;
    const fromFallback = SYSCALL_HASH_FALLBACKS[key];
    if (fromFallback) return fromFallback;
  }

  return null;
}

function getNativeContractName(hash) {
  const lower = hash.toLowerCase();
  if (lower === NEO_HASH) return "NEO";
  if (lower === GAS_HASH) return "GAS";
  if (lower === CONTRACT_MANAGEMENT_HASH) return "ContractManagement";
  return null;
}

function getContractName(hash) {
  const normalized = String(hash || "").toLowerCase();
  if (!normalized) return null;
  const nativeName = getNativeContractName(normalized);
  if (nativeName) return nativeName;

  const known = KNOWN_CONTRACTS[normalized];
  return known?.name || known?.symbol || null;
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
  
  if (name.startsWith("PUSHINT")) {
     // Neo uses little endian for integers
     let val = 0n;
     for (let i = operandBytes.length - 1; i >= 0; i--) {
        val = (val * 256n) + BigInt(operandBytes[i]);
     }
     // very naive signed decoding for visual fallback, better to use proper BigInt decoding
     return val.toString();
  }
  
  if (name.startsWith("PUSHDATA")) {
     try {
         // attempt to read as string if printable ascii
         const str = new TextDecoder("utf-8", { fatal: true }).decode(operandBytes);
         if (/^[\x20-\x7E]*$/.test(str)) return `"${str}"`;
     } catch (_e) { /* ignore */ }
  }

  // SYSCALL: resolve 4-byte hash to name
  if (name === "SYSCALL") {
    const syscallName = resolveSyscallName(hex);
    return syscallName ? syscallName : `0x${hex}`;
  }

  // PUSHDATA: try UTF-8, then show hex with length
  if (name.startsWith("PUSHDATA")) {
    const utf8 = tryUtf8(operandBytes);
    if (utf8) return `"${utf8}"`;
    // 20-byte = likely script hash
    if (operandBytes.length === 20) {
      const reversedHash = "0x" + reverseHexStr(hex);
      const nativeName = getNativeContractName(reversedHash);
      if (nativeName) {
        return `${reversedHash} (Native: ${nativeName})`;
      }

      const knownContractName = getContractName(reversedHash);
      if (knownContractName) {
        return `${reversedHash} (Contract)`;
      }

      try {
        const addr = scriptHashHexToAddress(reversedHash);
        return addr ? `${reversedHash} (Account: ${addr})` : `${reversedHash} (Hash160)`;
      } catch {
        return `${reversedHash} (Hash160)`;
      }
    }
    // 33-byte = likely compressed public key
    if (operandBytes.length === 33 && (operandBytes[0] === 0x02 || operandBytes[0] === 0x03)) {
      try {
        const addr = publicKeyToAddress(hex);
        return addr ? `0x${hex} (Account: ${addr})` : `0x${hex}`;
      } catch {
        return `0x${hex}`;
      }
    }
    // 32-byte = likely Hash256
    if (operandBytes.length === 32) return `0x${reverseHexStr(hex)} (Hash256)`;
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
      rawHex += bytesToHex(bytes.slice(pos, pos + prefixSize));
      pos += prefixSize;
      if (pos + dataLen > bytes.length) break;
      operandBytes = bytes.slice(pos, pos + dataLen);
      rawHex += bytesToHex(operandBytes);
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
      semantic: null,
    });
  }

  // Second pass: Enrich with semantic meaning for contract calls
  for (let i = 0; i < instructions.length; i++) {
    const inst = instructions[i];
    
    // Check for System.Contract.Call or CallNative
    if (inst.opcode === "SYSCALL" && (inst.operand === "System.Contract.Call" || inst.operand === "System.Contract.CallNative")) {
      // The N3 calling convention typically pushes args, then flags, then method name, then contract hash
      // So the instruction right before SYSCALL is usually the contract hash
      // And the one before that is the method name
      if (i >= 2) {
        const hashInst = instructions[i - 1];
        const methodInst = instructions[i - 2];
        
        let contractRef = hashInst.operand || "";
        let methodName = methodInst.operand || "";
        
        // Clean up string quotes
        if (methodName.startsWith('"') && methodName.endsWith('"')) {
          methodName = methodName.slice(1, -1);
        }
        
        // Force call target operand into explicit contract context.
        const hashMatch = contractRef.match(/0x[a-f0-9]{40}/i);
        if (hashMatch) {
          const contractHash = hashMatch[0].toLowerCase();
          const contractName = getContractName(contractHash);
          hashInst.operand = `${contractHash} (Contract)`;
          contractRef = contractName || contractHash;
        } else {
          const nativeMatch = contractRef.match(/Native:\s*([^)]+)/);
          if (nativeMatch) {
            contractRef = nativeMatch[1];
          }
        }
        
        if (contractRef && methodName && !methodName.includes("0x")) {
          inst.semantic = `${contractRef}.${methodName}(...)`;
        }
      }
    }
  }

  return instructions;
}

/**
 * Extracts the first contract invocation from a base64 script.
 * @param {string} base64Script 
 * @returns {{ contractHash: string, method: string } | null}
 */
export function extractContractInvocation(base64Script) {
  if (!base64Script) return null;
  try {
    const instructions = disassembleScript(base64Script);
    for (let i = 0; i < instructions.length; i++) {
      const inst = instructions[i];
      if (inst.opcode === 'SYSCALL' && (inst.operand === 'System.Contract.Call' || inst.operand === 'System.Contract.CallNative')) {
        if (i >= 2) {
          let operandContract = instructions[i - 1].operand || '';
          let methodName = instructions[i - 2].operand || '';
          
          if (methodName.startsWith('"') && methodName.endsWith('"')) {
             methodName = methodName.slice(1, -1);
          }
          
          let contractHash = null;
          const hashMatch = operandContract.match(/^(0x[a-fA-F0-9]{40})/i);
          if (hashMatch) {
             contractHash = hashMatch[1];
          }
          
          if (contractHash && methodName && !methodName.includes('0x')) {
            return { contractHash, method: methodName };
          }
        }
      }
    }
  } catch (e) {
    // Ignore disassembly errors to safely fallback to null
  }
  return null;
}
