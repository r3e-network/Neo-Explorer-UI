// EVM bytecode disassembler + calldata inspector for the Neo X (EVM) views.
//
// The Neo X sibling of the N3 script disassembler: turns raw hex into readable
// structure. Two distinct inputs exist on an EVM chain and they are NOT the
// same thing:
//   - CODE (contract deployed/creation bytecode, or the init code carried by a
//     contract-creation transaction's input) → disassemble() into opcodes.
//   - CALLDATA (a normal transaction's input) → NOT executable code; it is
//     ABI-encoded arguments. parseCalldata() breaks it into the 4-byte
//     selector + 32-byte words instead of pretending it is opcodes.
//
// Opcode table covers Frontier through Cancun (PUSH0, TLOAD/TSTORE, MCOPY,
// BLOBHASH, BLOBBASEFEE) — matching the "shanghai"+ EVM versions Neo X
// contracts compile against.

const OPCODES = {
  0x00: "STOP", 0x01: "ADD", 0x02: "MUL", 0x03: "SUB", 0x04: "DIV",
  0x05: "SDIV", 0x06: "MOD", 0x07: "SMOD", 0x08: "ADDMOD", 0x09: "MULMOD",
  0x0a: "EXP", 0x0b: "SIGNEXTEND",
  0x10: "LT", 0x11: "GT", 0x12: "SLT", 0x13: "SGT", 0x14: "EQ",
  0x15: "ISZERO", 0x16: "AND", 0x17: "OR", 0x18: "XOR", 0x19: "NOT",
  0x1a: "BYTE", 0x1b: "SHL", 0x1c: "SHR", 0x1d: "SAR",
  0x20: "KECCAK256",
  0x30: "ADDRESS", 0x31: "BALANCE", 0x32: "ORIGIN", 0x33: "CALLER",
  0x34: "CALLVALUE", 0x35: "CALLDATALOAD", 0x36: "CALLDATASIZE",
  0x37: "CALLDATACOPY", 0x38: "CODESIZE", 0x39: "CODECOPY", 0x3a: "GASPRICE",
  0x3b: "EXTCODESIZE", 0x3c: "EXTCODECOPY", 0x3d: "RETURNDATASIZE",
  0x3e: "RETURNDATACOPY", 0x3f: "EXTCODEHASH",
  0x40: "BLOCKHASH", 0x41: "COINBASE", 0x42: "TIMESTAMP", 0x43: "NUMBER",
  0x44: "PREVRANDAO", 0x45: "GASLIMIT", 0x46: "CHAINID", 0x47: "SELFBALANCE",
  0x48: "BASEFEE", 0x49: "BLOBHASH", 0x4a: "BLOBBASEFEE",
  0x50: "POP", 0x51: "MLOAD", 0x52: "MSTORE", 0x53: "MSTORE8", 0x54: "SLOAD",
  0x55: "SSTORE", 0x56: "JUMP", 0x57: "JUMPI", 0x58: "PC", 0x59: "MSIZE",
  0x5a: "GAS", 0x5b: "JUMPDEST", 0x5c: "TLOAD", 0x5d: "TSTORE", 0x5e: "MCOPY",
  0x5f: "PUSH0",
  0xa0: "LOG0", 0xa1: "LOG1", 0xa2: "LOG2", 0xa3: "LOG3", 0xa4: "LOG4",
  0xf0: "CREATE", 0xf1: "CALL", 0xf2: "CALLCODE", 0xf3: "RETURN",
  0xf4: "DELEGATECALL", 0xf5: "CREATE2", 0xfa: "STATICCALL",
  0xfd: "REVERT", 0xfe: "INVALID", 0xff: "SELFDESTRUCT",
};
// PUSH1..PUSH32 (0x60..0x7f), DUP1..DUP16 (0x80..0x8f), SWAP1..SWAP16 (0x90..0x9f)
for (let i = 0; i < 32; i += 1) OPCODES[0x60 + i] = `PUSH${i + 1}`;
for (let i = 0; i < 16; i += 1) OPCODES[0x80 + i] = `DUP${i + 1}`;
for (let i = 0; i < 16; i += 1) OPCODES[0x90 + i] = `SWAP${i + 1}`;

const strip0x = (hex) => {
  const s = String(hex || "").trim();
  return s.startsWith("0x") || s.startsWith("0X") ? s.slice(2) : s;
};

const isHex = (s) => /^[0-9a-fA-F]*$/.test(s);

/**
 * Disassemble EVM bytecode into instructions.
 *
 * @param {string} hex - Bytecode ("0x..." or bare hex).
 * @param {Object} [options]
 * @param {number} [options.maxInstructions=8192] - Hard cap (huge contracts).
 * @returns {{ instructions: Array<{offset:number, hexOffset:string, opcode:string, push:string|null, unknown:boolean, truncated:boolean}>, byteLength:number, truncatedOutput:boolean, error:string|null }}
 */
export function disassemble(hex, { maxInstructions = 8192 } = {}) {
  const clean = strip0x(hex);
  if (!clean) return { instructions: [], byteLength: 0, truncatedOutput: false, error: null };
  if (!isHex(clean) || clean.length % 2 !== 0) {
    return { instructions: [], byteLength: 0, truncatedOutput: false, error: "Invalid hex input" };
  }

  const bytes = clean.length / 2;
  const instructions = [];
  let pc = 0;
  let truncatedOutput = false;

  while (pc < bytes) {
    if (instructions.length >= maxInstructions) {
      truncatedOutput = true;
      break;
    }
    const byte = parseInt(clean.slice(pc * 2, pc * 2 + 2), 16);
    const name = OPCODES[byte];
    const inst = {
      offset: pc,
      hexOffset: `0x${pc.toString(16).padStart(4, "0")}`,
      opcode: name || `UNKNOWN_0x${byte.toString(16).padStart(2, "0")}`,
      push: null,
      unknown: !name,
      truncated: false,
    };
    pc += 1;

    if (byte >= 0x60 && byte <= 0x7f) {
      const pushLen = byte - 0x5f; // PUSH1 → 1 byte … PUSH32 → 32 bytes
      const available = Math.min(pushLen, bytes - pc);
      inst.push = `0x${clean.slice(pc * 2, (pc + available) * 2)}`;
      if (available < pushLen) inst.truncated = true;
      pc += available;
    }

    instructions.push(inst);
  }

  return { instructions, byteLength: bytes, truncatedOutput, error: null };
}

/**
 * Break ABI calldata into its 4-byte selector and 32-byte argument words.
 * Calldata is data, not code — this is the honest structured view for a
 * normal (non-creation) transaction input.
 *
 * @param {string} hex
 * @returns {{ selector: string|null, words: Array<{index:number, offset:string, hex:string}>, remainder: string|null, byteLength: number, error: string|null }}
 */
export function parseCalldata(hex) {
  const clean = strip0x(hex);
  if (!clean) return { selector: null, words: [], remainder: null, byteLength: 0, error: null };
  if (!isHex(clean) || clean.length % 2 !== 0) {
    return { selector: null, words: [], remainder: null, byteLength: 0, error: "Invalid hex input" };
  }

  const byteLength = clean.length / 2;
  const selector = byteLength >= 4 ? `0x${clean.slice(0, 8)}` : null;
  const body = byteLength >= 4 ? clean.slice(8) : clean;
  const words = [];
  let i = 0;
  for (; (i + 1) * 64 <= body.length; i += 1) {
    words.push({
      index: i,
      offset: `0x${(4 + i * 32).toString(16).padStart(4, "0")}`,
      hex: `0x${body.slice(i * 64, (i + 1) * 64)}`,
    });
  }
  const rest = body.slice(i * 64);
  return { selector, words, remainder: rest ? `0x${rest}` : null, byteLength, error: null };
}

export default disassemble;
