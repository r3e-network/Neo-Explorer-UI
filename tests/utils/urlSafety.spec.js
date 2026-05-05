import { sanitizeHttpUrl, sanitizeEmailAddress } from "@/utils/urlSafety";

describe("sanitizeHttpUrl", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(sanitizeHttpUrl(null)).toBe("");
    expect(sanitizeHttpUrl(undefined)).toBe("");
    expect(sanitizeHttpUrl("")).toBe("");
    expect(sanitizeHttpUrl("   ")).toBe("");
  });

  it("accepts http:// URLs", () => {
    expect(sanitizeHttpUrl("http://example.com")).toBe("http://example.com/");
  });

  it("accepts https:// URLs", () => {
    expect(sanitizeHttpUrl("https://example.com/path?q=1")).toBe("https://example.com/path?q=1");
  });

  it("trims surrounding whitespace before parsing", () => {
    expect(sanitizeHttpUrl("  https://example.com  ")).toBe("https://example.com/");
  });

  it("rejects javascript: protocol (XSS vector)", () => {
    expect(sanitizeHttpUrl("javascript:alert(1)")).toBe("");
  });

  it("rejects data: URLs", () => {
    expect(sanitizeHttpUrl("data:text/html,<script>alert(1)</script>")).toBe("");
  });

  it("rejects file: URLs", () => {
    expect(sanitizeHttpUrl("file:///etc/passwd")).toBe("");
  });

  it("rejects ftp: URLs (only http/https allowed)", () => {
    expect(sanitizeHttpUrl("ftp://example.com/file")).toBe("");
  });

  it("returns empty string for malformed URLs", () => {
    expect(sanitizeHttpUrl("not-a-url")).toBe("");
    expect(sanitizeHttpUrl("://broken")).toBe("");
  });

  it("coerces non-string inputs via String()", () => {
    expect(sanitizeHttpUrl(123)).toBe("");
    expect(sanitizeHttpUrl({ url: "x" })).toBe("");
  });
});

describe("sanitizeEmailAddress", () => {
  it("returns empty for null/undefined/empty", () => {
    expect(sanitizeEmailAddress(null)).toBe("");
    expect(sanitizeEmailAddress(undefined)).toBe("");
    expect(sanitizeEmailAddress("")).toBe("");
    expect(sanitizeEmailAddress("   ")).toBe("");
  });

  it("accepts valid email format", () => {
    expect(sanitizeEmailAddress("user@example.com")).toBe("user@example.com");
    expect(sanitizeEmailAddress("first.last+tag@sub.example.co.uk")).toBe("first.last+tag@sub.example.co.uk");
  });

  it("trims whitespace", () => {
    expect(sanitizeEmailAddress("  user@example.com  ")).toBe("user@example.com");
  });

  it("rejects emails with embedded spaces", () => {
    expect(sanitizeEmailAddress("user @example.com")).toBe("");
    expect(sanitizeEmailAddress("user@ example.com")).toBe("");
  });

  it("rejects emails with HTML-injection characters", () => {
    expect(sanitizeEmailAddress("user<script>@example.com")).toBe("");
    expect(sanitizeEmailAddress('user"@example.com')).toBe("");
    expect(sanitizeEmailAddress("user>@example.com")).toBe("");
  });

  it("rejects missing @ symbol", () => {
    expect(sanitizeEmailAddress("userexample.com")).toBe("");
  });

  it("rejects missing TLD", () => {
    expect(sanitizeEmailAddress("user@example")).toBe("");
  });

  it("rejects emails over 254 chars", () => {
    const tooLong = "a".repeat(245) + "@example.com";
    expect(tooLong.length).toBeGreaterThan(254);
    expect(sanitizeEmailAddress(tooLong)).toBe("");
  });

  it("accepts emails right at 254 char boundary", () => {
    const a = "a".repeat(242);
    const at254 = `${a}@example.com`;
    expect(at254.length).toBe(254);
    expect(sanitizeEmailAddress(at254)).toBe(at254);
  });
});
