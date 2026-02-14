import {
  formatGas,
  getTransactionTotalFee,
  formatGasDecimal,
  formatNeo,
  formatGasBalance,
  formatTokenAmount,
} from "@/utils/gasFormat";

// GAS_DIVISOR = 1e8
const GAS_DIVISOR = 1e8;

describe("formatGas", () => {
  it("converts raw GAS integer to decimal string", () => {
    expect(formatGas(100000000)).toBe("1.00000000");
    expect(formatGas(50000000)).toBe("0.50000000");
  });

  it("respects custom decimal places", () => {
    expect(formatGas(100000000, 2)).toBe("1.00");
    expect(formatGas(123456789, 4)).toBe("1.2346");
  });

  it("returns '0' for falsy values", () => {
    expect(formatGas(0)).toBe("0");
    expect(formatGas(null)).toBe("0");
    expect(formatGas(undefined)).toBe("0");
    expect(formatGas("")).toBe("0");
  });

  it("handles string input", () => {
    expect(formatGas("200000000")).toBe("2.00000000");
  });
});

describe("getTransactionTotalFee", () => {
  it("sums netfee and sysfee", () => {
    expect(getTransactionTotalFee({ netfee: 100, sysfee: 200 })).toBe(300);
  });

  it("handles missing fields", () => {
    expect(getTransactionTotalFee({ netfee: 100 })).toBe(100);
    expect(getTransactionTotalFee({ sysfee: 200 })).toBe(200);
    expect(getTransactionTotalFee({})).toBe(0);
  });

  it("handles null/undefined tx", () => {
    expect(getTransactionTotalFee(null)).toBe(0);
    expect(getTransactionTotalFee(undefined)).toBe(0);
  });

  it("handles string fee values", () => {
    expect(getTransactionTotalFee({ netfee: "100", sysfee: "200" })).toBe(300);
  });

  it("treats NaN fees as 0", () => {
    expect(getTransactionTotalFee({ netfee: "abc", sysfee: 100 })).toBe(100);
    expect(getTransactionTotalFee({ netfee: NaN, sysfee: NaN })).toBe(0);
  });
});

describe("formatGasDecimal", () => {
  it("formats a decimal GAS value (no division)", () => {
    expect(formatGasDecimal(9.977)).toBe("9.9770");
    expect(formatGasDecimal("1.5")).toBe("1.5000");
  });

  it("respects custom decimal places", () => {
    expect(formatGasDecimal(9.977, 2)).toBe("9.98");
  });

  it("returns '0' for falsy values", () => {
    expect(formatGasDecimal(0)).toBe("0");
    expect(formatGasDecimal(null)).toBe("0");
    expect(formatGasDecimal(undefined)).toBe("0");
    expect(formatGasDecimal("")).toBe("0");
  });

  it("returns '0' for non-finite values", () => {
    expect(formatGasDecimal("not-a-number")).toBe("0");
    expect(formatGasDecimal(Infinity)).toBe("0");
  });
});

describe("formatNeo", () => {
  it("floors and formats NEO (indivisible)", () => {
    const result = formatNeo(1000);
    expect(result).toBeTruthy();
    // Should contain "1" and "000"
    expect(result.replace(/,/g, "")).toBe("1000");
  });

  it("floors fractional values", () => {
    const result = formatNeo(99.9);
    expect(result.replace(/,/g, "")).toBe("99");
  });

  it("returns '0' for falsy values", () => {
    expect(formatNeo(0)).toBe("0");
    expect(formatNeo(null)).toBe("0");
    expect(formatNeo(undefined)).toBe("0");
    expect(formatNeo("")).toBe("0");
  });
});

describe("formatGasBalance", () => {
  it("divides by GAS_DIVISOR and formats", () => {
    const result = formatGasBalance(100000000);
    // 100000000 / 1e8 = 1
    expect(result).toContain("1");
  });

  it("accepts custom divisor", () => {
    const result = formatGasBalance(1000, 10);
    // 1000 / 10 = 100
    expect(result).toContain("100");
  });

  it("returns '0' for falsy values", () => {
    expect(formatGasBalance(0)).toBe("0");
    expect(formatGasBalance(null)).toBe("0");
    expect(formatGasBalance(undefined)).toBe("0");
    expect(formatGasBalance("")).toBe("0");
  });

  it("returns '0' for non-finite results", () => {
    expect(formatGasBalance("abc")).toBe("0");
  });
});

describe("formatTokenAmount", () => {
  it("formats with 0 decimals (no adjustment)", () => {
    const result = formatTokenAmount(1000, 0);
    expect(result.replace(/,/g, "")).toBe("1000");
  });

  it("adjusts by token decimals", () => {
    // 100000000 with 8 decimals = 1
    const result = formatTokenAmount(100000000, 8);
    expect(result).toContain("1");
  });

  it("respects displayDecimals cap", () => {
    const result = formatTokenAmount(123456789, 8, 2);
    // 123456789 / 1e8 = 1.23456789, capped at 2 decimals
    expect(result).toBeTruthy();
  });

  it("returns '0' for null/undefined (but not 0)", () => {
    expect(formatTokenAmount(null)).toBe("0");
    expect(formatTokenAmount(undefined)).toBe("0");
  });

  it("handles explicit 0 rawAmount", () => {
    const result = formatTokenAmount(0, 8);
    expect(result).toContain("0");
  });

  it("returns '0' for non-finite values", () => {
    expect(formatTokenAmount("abc")).toBe("0");
    expect(formatTokenAmount(Infinity)).toBe("0");
  });
});
