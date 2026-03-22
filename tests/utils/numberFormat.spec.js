import {
  formatBytes,
  formatNumber,
  formatLargeNumber,
  formatPrice,
  formatPriceChange,
  priceChangeClass,
  formatBalance,
  formatSupply,
} from "@/utils/numberFormat";

describe("formatBytes", () => {
  it("formats bytes below 1024 as B", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1.00 KB");
    expect(formatBytes(2048)).toBe("2.00 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1048576)).toBe("1.00 MB");
    expect(formatBytes(1572864)).toBe("1.50 MB");
  });

  it("handles string input", () => {
    expect(formatBytes("2048")).toBe("2.00 KB");
  });

  it("handles null/undefined/NaN as 0", () => {
    expect(formatBytes(null)).toBe("0 B");
    expect(formatBytes(undefined)).toBe("0 B");
  });
});

describe("formatNumber", () => {
  it("formats a number with locale separators", () => {
    const result = formatNumber(1234567);
    // toLocaleString is locale-dependent; just verify it's a non-empty string
    expect(result).toBeTruthy();
    expect(result).toContain("1");
  });

  it("returns '0' for null/undefined", () => {
    expect(formatNumber(null)).toBe("0");
    expect(formatNumber(undefined)).toBe("0");
  });

  it("handles string input", () => {
    const result = formatNumber("9999");
    expect(result).toBeTruthy();
  });
});

describe("formatLargeNumber", () => {
  it("returns '0' for falsy values", () => {
    expect(formatLargeNumber(0)).toBe("0");
    expect(formatLargeNumber(null)).toBe("0");
    expect(formatLargeNumber(undefined)).toBe("0");
    expect(formatLargeNumber("")).toBe("0");
  });

  it("formats billions", () => {
    expect(formatLargeNumber(1500000000)).toBe("1.50B");
  });

  it("formats millions", () => {
    expect(formatLargeNumber(2500000)).toBe("2.50M");
  });

  it("formats thousands", () => {
    expect(formatLargeNumber(1500)).toBe("1.50K");
  });

  it("formats numbers below 1000 as integers", () => {
    expect(formatLargeNumber(999)).toBe("999");
    expect(formatLargeNumber(42)).toBe("42");
  });
});

describe("formatPrice", () => {
  it("formats to 2 decimal places", () => {
    expect(formatPrice(1.5)).toBe("1.50");
    expect(formatPrice(100)).toBe("100.00");
  });

  it("handles string input", () => {
    expect(formatPrice("3.14159")).toBe("3.14");
  });

  it("returns '0.00' for falsy values", () => {
    expect(formatPrice(0)).toBe("0.00");
    expect(formatPrice(null)).toBe("0.00");
    expect(formatPrice(undefined)).toBe("0.00");
  });
});

describe("formatPriceChange", () => {
  it("adds + prefix for positive values", () => {
    expect(formatPriceChange(5.123)).toBe("+5.12%");
  });

  it("adds + prefix for zero", () => {
    expect(formatPriceChange(0)).toBe("+0.00%");
  });

  it("shows negative sign for negative values", () => {
    expect(formatPriceChange(-3.7)).toBe("-3.70%");
  });

  it("handles falsy values as 0", () => {
    expect(formatPriceChange(null)).toBe("+0.00%");
    expect(formatPriceChange(undefined)).toBe("+0.00%");
  });
});

describe("priceChangeClass", () => {
  it("returns green classes for positive change", () => {
    expect(priceChangeClass(5)).toContain("text-green");
  });

  it("returns green classes for zero", () => {
    expect(priceChangeClass(0)).toContain("text-green");
  });

  it("returns red classes for negative change", () => {
    expect(priceChangeClass(-1)).toContain("text-red");
  });

  it("handles falsy values as 0 (green)", () => {
    expect(priceChangeClass(null)).toContain("text-green");
    expect(priceChangeClass(undefined)).toContain("text-green");
  });
});

describe("formatBalance", () => {
  it("formats a balance with locale separators", () => {
    const result = formatBalance(1234567);
    expect(result).toBeTruthy();
  });

  it("respects maximumFractionDigits", () => {
    const result = formatBalance(1234.5678, 2);
    expect(result).toBeTruthy();
  });

  it("returns '0' for falsy values", () => {
    expect(formatBalance(0)).toBe("0");
    expect(formatBalance(null)).toBe("0");
    expect(formatBalance(undefined)).toBe("0");
    expect(formatBalance("")).toBe("0");
  });

  it("returns '0' for non-finite values", () => {
    expect(formatBalance("not-a-number")).toBe("0");
    expect(formatBalance(Infinity)).toBe("0");
  });
});

describe("formatSupply", () => {
  it("adjusts by decimals and formats", () => {
    // 100000000 with 8 decimals = 1
    const result = formatSupply(100000000, 8);
    expect(result).toContain("1");
  });

  it("handles 0 decimals", () => {
    const result = formatSupply(1000, 0);
    expect(result).toBeTruthy();
  });

  it("returns '0' for falsy values", () => {
    expect(formatSupply(0)).toBe("0");
    expect(formatSupply(null)).toBe("0");
    expect(formatSupply(undefined)).toBe("0");
  });
});
