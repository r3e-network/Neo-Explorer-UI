import { describe, it, expect } from "vitest";
import { disassemble, parseCalldata } from "../../src/utils/evmDisasm.js";

describe("evmDisasm disassemble", () => {
  it("disassembles a classic Solidity prologue", () => {
    // 6080604052 = PUSH1 0x80, PUSH1 0x40, MSTORE
    const { instructions, byteLength, error } = disassemble("0x6080604052");
    expect(error).toBeNull();
    expect(byteLength).toBe(5);
    expect(instructions).toHaveLength(3);
    expect(instructions[0]).toMatchObject({ offset: 0, opcode: "PUSH1", push: "0x80" });
    expect(instructions[1]).toMatchObject({ offset: 2, opcode: "PUSH1", push: "0x40" });
    expect(instructions[2]).toMatchObject({ offset: 4, opcode: "MSTORE", push: null });
  });

  it("handles PUSH0, transient storage and MCOPY (Shanghai/Cancun)", () => {
    // 5f 5c 5d 5e = PUSH0, TLOAD, TSTORE, MCOPY
    const { instructions } = disassemble("5f5c5d5e");
    expect(instructions.map((i) => i.opcode)).toEqual(["PUSH0", "TLOAD", "TSTORE", "MCOPY"]);
  });

  it("consumes full PUSH32 immediates and marks truncated pushes", () => {
    const word = "ff".repeat(32);
    const full = disassemble(`0x7f${word}00`); // PUSH32 <32 bytes> STOP
    expect(full.instructions).toHaveLength(2);
    expect(full.instructions[0]).toMatchObject({ opcode: "PUSH32", push: `0x${word}`, truncated: false });
    expect(full.instructions[1].opcode).toBe("STOP");

    const cut = disassemble("0x7fffff"); // PUSH32 with only 2 bytes left
    expect(cut.instructions).toHaveLength(1);
    expect(cut.instructions[0]).toMatchObject({ opcode: "PUSH32", push: "0xffff", truncated: true });
  });

  it("labels unassigned bytes as UNKNOWN and keeps going", () => {
    const { instructions } = disassemble("0x0c00"); // 0x0c unassigned, STOP
    expect(instructions[0]).toMatchObject({ opcode: "UNKNOWN_0x0c", unknown: true });
    expect(instructions[1].opcode).toBe("STOP");
  });

  it("computes hex offsets and DUP/SWAP/LOG names", () => {
    const { instructions } = disassemble("0x8091a15b"); // DUP1 SWAP2 LOG1 JUMPDEST
    expect(instructions.map((i) => i.opcode)).toEqual(["DUP1", "SWAP2", "LOG1", "JUMPDEST"]);
    expect(instructions[3].hexOffset).toBe("0x0003");
  });

  it("rejects invalid hex and odd length; empty input yields empty output", () => {
    expect(disassemble("0xzz").error).toBe("Invalid hex input");
    expect(disassemble("0x123").error).toBe("Invalid hex input");
    expect(disassemble("").instructions).toEqual([]);
    expect(disassemble("0x").instructions).toEqual([]);
  });

  it("caps output at maxInstructions and flags truncation", () => {
    const many = "00".repeat(50); // 50 STOPs
    const res = disassemble(many, { maxInstructions: 10 });
    expect(res.instructions).toHaveLength(10);
    expect(res.truncatedOutput).toBe(true);
  });
});

describe("evmDisasm parseCalldata", () => {
  it("splits selector and 32-byte words with offsets", () => {
    const arg1 = "00".repeat(12) + "ab".repeat(20); // padded address
    const arg2 = "00".repeat(31) + "05";
    const { selector, words, remainder, byteLength, error } = parseCalldata(`0xa9059cbb${arg1}${arg2}`);
    expect(error).toBeNull();
    expect(selector).toBe("0xa9059cbb");
    expect(byteLength).toBe(4 + 64);
    expect(words).toHaveLength(2);
    expect(words[0]).toMatchObject({ index: 0, offset: "0x0004", hex: `0x${arg1}` });
    expect(words[1]).toMatchObject({ index: 1, offset: "0x0024", hex: `0x${arg2}` });
    expect(remainder).toBeNull();
  });

  it("keeps a non-multiple-of-32 tail as remainder", () => {
    const { selector, words, remainder } = parseCalldata("0xdeadbeef" + "11".repeat(32) + "22");
    expect(selector).toBe("0xdeadbeef");
    expect(words).toHaveLength(1);
    expect(remainder).toBe("0x22");
  });

  it("handles sub-selector input and empty input", () => {
    expect(parseCalldata("0x1234").selector).toBeNull();
    expect(parseCalldata("").byteLength).toBe(0);
    expect(parseCalldata("0xoops").error).toBe("Invalid hex input");
  });
});
