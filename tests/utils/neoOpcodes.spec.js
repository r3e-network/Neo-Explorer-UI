import { OPCODES, SYSCALL_HASHES } from "@/utils/neoOpcodes";

describe("neoOpcodes", () => {
  describe("OPCODES", () => {
    it("is a non-empty object keyed by numeric strings", () => {
      const keys = Object.keys(OPCODES);
      expect(keys.length).toBeGreaterThan(100);
      keys.forEach((k) => expect(Number.isFinite(Number(k))).toBe(true));
    });

    it("every entry has required shape { name, operandSize, prefix, desc }", () => {
      Object.values(OPCODES).forEach((op) => {
        expect(op).toHaveProperty("name");
        expect(op).toHaveProperty("operandSize");
        expect(op).toHaveProperty("prefix");
        expect(op).toHaveProperty("desc");
        expect(typeof op.name).toBe("string");
        expect(typeof op.operandSize).toBe("number");
        expect(typeof op.prefix).toBe("number");
      });
    });

    it("contains well-known opcodes at expected keys", () => {
      expect(OPCODES["0"].name).toBe("PUSHINT8");
      expect(OPCODES["33"].name).toBe("NOP");
      expect(OPCODES["64"].name).toBe("RET");
      expect(OPCODES["65"].name).toBe("SYSCALL");
      expect(OPCODES["158"].name).toBe("ADD");
    });

    it("PUSHDATA opcodes have prefix > 0 and operandSize -1", () => {
      ["12", "13", "14"].forEach((key) => {
        expect(OPCODES[key].operandSize).toBe(-1);
        expect(OPCODES[key].prefix).toBeGreaterThan(0);
      });
    });

    it("PUSH0-PUSH16 opcodes have operandSize 0 and prefix 0", () => {
      for (let i = 16; i <= 32; i++) {
        const op = OPCODES[String(i)];
        expect(op.operandSize).toBe(0);
        expect(op.prefix).toBe(0);
      }
    });

    it("has no duplicate opcode names", () => {
      const names = Object.values(OPCODES).map((o) => o.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe("SYSCALL_HASHES", () => {
    it("is a non-empty object keyed by 0x-prefixed hex strings", () => {
      const keys = Object.keys(SYSCALL_HASHES);
      expect(keys.length).toBeGreaterThan(20);
      keys.forEach((k) => expect(k).toMatch(/^0x[0-9a-f]{8}$/));
    });

    it("every value is a dotted namespace string", () => {
      Object.values(SYSCALL_HASHES).forEach((v) => {
        expect(typeof v).toBe("string");
        expect(v.split(".").length).toBeGreaterThanOrEqual(2);
      });
    });

    it("contains well-known syscalls", () => {
      expect(Object.values(SYSCALL_HASHES)).toContain("System.Storage.Get");
      expect(Object.values(SYSCALL_HASHES)).toContain("System.Runtime.Notify");
      expect(Object.values(SYSCALL_HASHES)).toContain("System.Contract.Call");
      expect(Object.values(SYSCALL_HASHES)).toContain("System.Crypto.CheckSig");
    });

    it("has no duplicate syscall names", () => {
      const values = Object.values(SYSCALL_HASHES);
      expect(new Set(values).size).toBe(values.length);
    });
  });
});
