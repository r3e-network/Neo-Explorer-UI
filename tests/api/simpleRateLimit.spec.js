import { describe, expect, it } from "vitest";
import { getClientIp } from "../../api/lib/simpleRateLimit.js";

describe("simple rate-limit client IP parsing", () => {
  it("rejects malformed forwarded IP candidates and falls back to remote address", () => {
    const req = {
      headers: {
        "x-forwarded-for": "999.999.999.999",
        "cf-connecting-ip": "abc123",
      },
      socket: { remoteAddress: "203.0.113.77" },
    };

    expect(getClientIp(req, { trustProxy: true })).toBe("203.0.113.77");
  });

  it("accepts valid forwarded IPv6 candidates when proxy headers are trusted", () => {
    const req = {
      headers: { "x-forwarded-for": "2001:db8::1, 203.0.113.10" },
      socket: { remoteAddress: "203.0.113.77" },
    };

    expect(getClientIp(req, { trustProxy: true })).toBe("2001:db8::1");
  });
});
