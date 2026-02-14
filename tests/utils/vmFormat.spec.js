import {
  vmStateClass,
  vmStateDot,
  getTypeIcon,
  getTypeIconClass,
  getTypeBadgeClass,
  opcodeColorClass,
  getContractDisplayName,
} from "@/utils/vmFormat";

describe("vmStateClass", () => {
  it("returns emerald classes for HALT", () => {
    const cls = vmStateClass("HALT");
    expect(cls).toContain("emerald");
    expect(cls).toContain("text-emerald");
  });

  it("returns red classes for FAULT", () => {
    const cls = vmStateClass("FAULT");
    expect(cls).toContain("red");
    expect(cls).toContain("text-red");
  });

  it("returns gray classes for unknown state", () => {
    expect(vmStateClass("UNKNOWN")).toContain("gray");
    expect(vmStateClass("")).toContain("gray");
    expect(vmStateClass(null)).toContain("gray");
    expect(vmStateClass(undefined)).toContain("gray");
  });
});

describe("vmStateDot", () => {
  it("returns emerald for HALT", () => {
    expect(vmStateDot("HALT")).toBe("bg-emerald-500");
  });

  it("returns red for FAULT", () => {
    expect(vmStateDot("FAULT")).toBe("bg-red-500");
  });

  it("returns gray for anything else", () => {
    expect(vmStateDot("OTHER")).toBe("bg-gray-400");
    expect(vmStateDot(null)).toBe("bg-gray-400");
    expect(vmStateDot(undefined)).toBe("bg-gray-400");
  });
});

describe("getTypeIcon", () => {
  it("returns correct abbreviations for known types", () => {
    expect(getTypeIcon("block")).toBe("Bk");
    expect(getTypeIcon("transaction")).toBe("Tx");
    expect(getTypeIcon("address")).toBe("Ad");
    expect(getTypeIcon("contract")).toBe("Ct");
    expect(getTypeIcon("token")).toBe("Tk");
  });

  it("returns '?' for unknown types", () => {
    expect(getTypeIcon("unknown")).toBe("?");
    expect(getTypeIcon("")).toBe("?");
    expect(getTypeIcon(null)).toBe("?");
    expect(getTypeIcon(undefined)).toBe("?");
  });
});

describe("getTypeIconClass", () => {
  it("returns type-specific classes for known types", () => {
    expect(getTypeIconClass("block")).toContain("primary");
    expect(getTypeIconClass("transaction")).toContain("green");
    expect(getTypeIconClass("address")).toContain("orange");
    expect(getTypeIconClass("contract")).toContain("purple");
    expect(getTypeIconClass("token")).toContain("blue");
  });

  it("returns primary fallback for unknown types", () => {
    expect(getTypeIconClass("unknown")).toContain("primary");
    expect(getTypeIconClass(null)).toContain("primary");
  });
});

describe("getTypeBadgeClass", () => {
  it("returns type-specific classes for known types", () => {
    expect(getTypeBadgeClass("block")).toContain("primary");
    expect(getTypeBadgeClass("transaction")).toContain("green");
    expect(getTypeBadgeClass("address")).toContain("orange");
    expect(getTypeBadgeClass("contract")).toContain("purple");
    expect(getTypeBadgeClass("token")).toContain("blue");
  });

  it("returns gray fallback for unknown types", () => {
    expect(getTypeBadgeClass("unknown")).toContain("gray");
    expect(getTypeBadgeClass(null)).toContain("gray");
  });
});

describe("opcodeColorClass", () => {
  it("returns emerald for stack ops (PUSH/POP/NOP)", () => {
    expect(opcodeColorClass("PUSH1")).toContain("emerald");
    expect(opcodeColorClass("PUSHDATA1")).toContain("emerald");
    expect(opcodeColorClass("POP")).toContain("emerald");
    expect(opcodeColorClass("NOP")).toContain("emerald");
  });

  it("returns blue for call ops", () => {
    expect(opcodeColorClass("SYSCALL")).toContain("blue");
    expect(opcodeColorClass("CALL")).toContain("blue");
    expect(opcodeColorClass("CALLT")).toContain("blue");
    expect(opcodeColorClass("CALLA")).toContain("blue");
  });

  it("returns amber for jump/control ops", () => {
    expect(opcodeColorClass("JMP")).toContain("amber");
    expect(opcodeColorClass("JMPIF")).toContain("amber");
    expect(opcodeColorClass("RET")).toContain("amber");
    expect(opcodeColorClass("ABORT")).toContain("amber");
    expect(opcodeColorClass("THROW")).toContain("amber");
  });

  it("returns purple for load/store ops", () => {
    expect(opcodeColorClass("LDLOC0")).toContain("purple");
    expect(opcodeColorClass("STLOC0")).toContain("purple");
    expect(opcodeColorClass("LDSFLD")).toContain("purple");
    expect(opcodeColorClass("STSFLD")).toContain("purple");
  });

  it("is case-insensitive", () => {
    expect(opcodeColorClass("push1")).toContain("emerald");
    expect(opcodeColorClass("syscall")).toContain("blue");
  });

  it("returns gray for unknown opcodes", () => {
    expect(opcodeColorClass("ADD")).toContain("gray");
    expect(opcodeColorClass("MUL")).toContain("gray");
  });

  it("returns gray for falsy input", () => {
    expect(opcodeColorClass(null)).toContain("gray");
    expect(opcodeColorClass(undefined)).toContain("gray");
    expect(opcodeColorClass("")).toContain("gray");
  });
});

describe("getContractDisplayName", () => {
  it("returns native contract name for known hashes", () => {
    expect(getContractDisplayName("0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5")).toBe("NeoToken");
    expect(getContractDisplayName("0xd2a4cff31913016155e38e474a2c06d08be276cf")).toBe("GasToken");
  });

  it("is case-insensitive for hash lookup", () => {
    expect(getContractDisplayName("0xEF4073A0F2B305A38EC4050E4D3D28BC40EA63F5")).toBe("NeoToken");
  });

  it("returns manifestName when hash is not native", () => {
    expect(getContractDisplayName("0x" + "0".repeat(64), "MyContract")).toBe("MyContract");
  });

  it("falls back to truncated hash when no name available", () => {
    const hash = "0x" + "a".repeat(64);
    const result = getContractDisplayName(hash);
    expect(result).toContain("...");
  });

  it("handles null/undefined hash", () => {
    const result = getContractDisplayName(null);
    // truncateHash(null) returns ""
    expect(result).toBe("");
  });

  it("prefers native name over manifestName", () => {
    expect(getContractDisplayName("0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5", "ShouldNotShow")).toBe("NeoToken");
  });
});
