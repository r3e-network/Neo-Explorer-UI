import { formatDate, formatCompactHash, handleCouncilLogoError } from "@/utils/governanceHelpers";

describe("formatDate", () => {
  it("returns 'Unknown' for null/undefined/empty", () => {
    expect(formatDate(null)).toBe("Unknown");
    expect(formatDate(undefined)).toBe("Unknown");
    expect(formatDate("")).toBe("Unknown");
  });

  it("formats a valid ISO string into a locale string", () => {
    const result = formatDate("2026-03-15T12:00:00Z");
    expect(result).not.toBe("Unknown");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("formats a Date object", () => {
    const date = new Date("2026-01-01T00:00:00Z");
    const result = formatDate(date);
    expect(result).not.toBe("Unknown");
    expect(typeof result).toBe("string");
  });

  it("returns Date toLocaleString output for valid timestamps", () => {
    const ts = "2026-06-15T10:30:00Z";
    const expected = new Date(ts).toLocaleString();
    expect(formatDate(ts)).toBe(expected);
  });
});

describe("formatCompactHash", () => {
  it("returns 'Unavailable' for null/undefined/empty/whitespace", () => {
    expect(formatCompactHash(null)).toBe("Unavailable");
    expect(formatCompactHash(undefined)).toBe("Unavailable");
    expect(formatCompactHash("")).toBe("Unavailable");
    expect(formatCompactHash("   ")).toBe("Unavailable");
  });

  it("returns the original value when shorter than prefix+suffix+3", () => {
    expect(formatCompactHash("0xshort")).toBe("0xshort");
  });

  it("truncates long hashes with default prefix=12 and suffix=8", () => {
    const hash = "0x1234567890abcdef1234567890abcdef12345678";
    const result = formatCompactHash(hash);
    expect(result).toBe("0x1234567890...12345678");
    expect(result.startsWith("0x1234567890")).toBe(true);
    expect(result.endsWith("12345678")).toBe(true);
    expect(result).toContain("...");
  });

  it("respects custom prefix and suffix lengths", () => {
    const hash = "abcdefghijklmnopqrstuvwxyz0123456789";
    expect(formatCompactHash(hash, 4, 4)).toBe("abcd...6789");
  });

  it("trims surrounding whitespace before truncation", () => {
    const result = formatCompactHash("  0x1234567890abcdef1234567890abcdef12345678  ");
    expect(result).toBe("0x1234567890...12345678");
  });

  it("coerces non-string inputs via String()", () => {
    expect(formatCompactHash(12345)).toBe("12345");
  });
});

describe("handleCouncilLogoError", () => {
  function makeEvent(initialIndex = "0") {
    const target = document.createElement("img");
    if (initialIndex !== null) {
      target.dataset.logoFallbackIndex = initialIndex;
    }
    return { event: { target }, target };
  }

  it("is a no-op when event has no target", () => {
    expect(() => handleCouncilLogoError({ target: null })).not.toThrow();
    expect(() => handleCouncilLogoError(null)).not.toThrow();
    expect(() => handleCouncilLogoError(undefined)).not.toThrow();
  });

  it("advances the fallback index by 1 and uses the next source", () => {
    const { event, target } = makeEvent("0");
    handleCouncilLogoError(event, ["src1.png", "src2.png", "src3.png"]);
    expect(target.dataset.logoFallbackIndex).toBe("1");
    expect(target.src).toContain("src2.png");
  });

  it("falls back to the default neo.png after exhausting sources", () => {
    const { event, target } = makeEvent("2"); // index 2 → next is 3 → out of bounds
    handleCouncilLogoError(event, ["src1.png", "src2.png", "src3.png"]);
    expect(target.dataset.logoFallbackIndex).toBe("3");
    expect(target.src).toContain("/img/brand/neo.png");
  });

  it("uses a custom fallback when provided", () => {
    const { event, target } = makeEvent("5");
    handleCouncilLogoError(event, [], "https://custom.example/logo.svg");
    expect(target.src).toBe("https://custom.example/logo.svg");
  });

  it("starts at index 0 → 1 when no dataset value present", () => {
    const target = document.createElement("img");
    // no dataset.logoFallbackIndex set → defaults to "0"
    handleCouncilLogoError({ target }, ["src1.png", "src2.png"]);
    expect(target.dataset.logoFallbackIndex).toBe("1");
    expect(target.src).toContain("src2.png");
  });

  it("treats non-numeric dataset value as starting at 0+1=1", () => {
    const { event, target } = makeEvent("not-a-number");
    handleCouncilLogoError(event, ["src1.png", "src2.png", "src3.png"]);
    expect(target.dataset.logoFallbackIndex).toBe("1");
    expect(target.src).toContain("src2.png");
  });
});
