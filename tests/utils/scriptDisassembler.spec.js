import { describe, expect, it } from "vitest";

import { disassembleScript } from "@/utils/scriptDisassembler";

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

describe("scriptDisassembler syscall resolution", () => {
  it("resolves known syscall hash with 0x-prefixed map keys", () => {
    const script = bytesToBase64([0x41, 0x1f, 0x0b, 0x09, 0x41]); // SYSCALL 0x1f0b0941
    const [first] = disassembleScript(script);

    expect(first.opcode).toBe("SYSCALL");
    expect(first.operand).toBe("System.Runtime.Log");
  });

  it("resolves System.Contract.Call from modern syscall hash 0x627d5b52", () => {
    const script = bytesToBase64([0x41, 0x62, 0x7d, 0x5b, 0x52]); // SYSCALL 0x627d5b52
    const [first] = disassembleScript(script);

    expect(first.opcode).toBe("SYSCALL");
    expect(first.operand).toBe("System.Contract.Call");
  });

  it("resolves System.Crypto.CheckSig from syscall hash 0x56e7b327", () => {
    const script = bytesToBase64([0x41, 0x56, 0xe7, 0xb3, 0x27]); // SYSCALL 0x56e7b327
    const [first] = disassembleScript(script);

    expect(first.opcode).toBe("SYSCALL");
    expect(first.operand).toBe("System.Crypto.CheckSig");
  });

  it("marks call-target hash160 as contract context (not account) before System.Contract.Call", () => {
    const contractHash = "0x7b9e82e52ba4250bb710ebe376c146676b023da8";
    const hashBytes = contractHash
      .replace(/^0x/i, "")
      .match(/.{2}/g)
      .reverse()
      .map((pair) => Number.parseInt(pair, 16));

    const method = "updateMerkleRoot";
    const methodBytes = Array.from(method).map((ch) => ch.charCodeAt(0));

    const script = bytesToBase64([
      0x1f, // PUSH15
      0x0c, // PUSHDATA1
      methodBytes.length,
      ...methodBytes,
      0x0c, // PUSHDATA1
      hashBytes.length,
      ...hashBytes,
      0x41, // SYSCALL
      0x62,
      0x7d,
      0x5b,
      0x52,
    ]);

    const instructions = disassembleScript(script);
    const hashOperand = instructions.find((inst) => inst.operand?.startsWith(contractHash))?.operand || "";
    const syscall = instructions[instructions.length - 1];

    expect(hashOperand).toContain("(Contract");
    expect(hashOperand).not.toContain("(Account:");
    expect(syscall.operand).toBe("System.Contract.Call");
  });

  it("renders known contract Hash160 operands as contract labels", () => {
    const contractHash = "0x48c40d4666f93408be1bef038b6722404d9a4c2a";
    const hashBytes = contractHash
      .replace(/^0x/i, "")
      .match(/.{2}/g)
      .reverse()
      .map((pair) => Number.parseInt(pair, 16));

    const script = bytesToBase64([
      0x0c, // PUSHDATA1
      hashBytes.length,
      ...hashBytes,
    ]);

    const [first] = disassembleScript(script);

    expect(first.opcode).toBe("PUSHDATA1");
    expect(first.operand).toContain("(Contract)");
    expect(first.operand).not.toContain("(Contract:");
    expect(first.operand).not.toContain("(Account:");
  });

  it("keeps contract operand generic while preserving syscall semantic target", () => {
    const contractHash = "0x48c40d4666f93408be1bef038b6722404d9a4c2a";
    const hashBytes = contractHash
      .replace(/^0x/i, "")
      .match(/.{2}/g)
      .reverse()
      .map((pair) => Number.parseInt(pair, 16));

    const method = "requestService";
    const methodBytes = Array.from(method).map((ch) => ch.charCodeAt(0));

    const script = bytesToBase64([
      0x1f, // PUSH15
      0x0c, // PUSHDATA1
      methodBytes.length,
      ...methodBytes,
      0x0c, // PUSHDATA1
      hashBytes.length,
      ...hashBytes,
      0x41, // SYSCALL
      0x62,
      0x7d,
      0x5b,
      0x52,
    ]);

    const instructions = disassembleScript(script);
    const hashOperand = instructions.find((inst) => inst.operand?.startsWith(contractHash))?.operand || "";
    const syscall = instructions[instructions.length - 1];

    expect(hashOperand).toContain("(Contract)");
    expect(hashOperand).not.toContain("(Contract:");
    expect(syscall.operand).toBe("System.Contract.Call");
    expect(syscall.semantic).toBe("bNEO.requestService(...)");
  });
});
