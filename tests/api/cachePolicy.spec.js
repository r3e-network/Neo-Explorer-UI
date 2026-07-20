import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  NO_STORE_HEADERS,
  neoXRestProfile,
  neoXRpcProfile,
  publicCacheHeaders,
} = require("../../api/lib/cachePolicy");

describe("public explorer cache policy", () => {
  it("uses separate browser and CDN TTLs without disabling stale revalidation", () => {
    const headers = publicCacheHeaders("policy");

    expect(headers["Cache-Control"]).toContain("max-age=60");
    expect(headers["Cloudflare-CDN-Cache-Control"]).toContain("max-age=300");
    expect(headers["Cloudflare-CDN-Cache-Control"]).toContain("stale-while-revalidate=3600");
    expect(Object.values(headers).join(" ")).not.toContain("s-maxage");
  });

  it("assigns semantic profiles to live, mutable, and immutable Neo X reads", () => {
    expect(neoXRestProfile(["main-page", "blocks"])).toBe("live");
    expect(neoXRestProfile(["addresses", "0x1234"])).toBe("account");
    expect(neoXRestProfile(["transactions", "0x1234", "logs"])).toBe("immutable");
    expect(neoXRpcProfile("eth_envelopeFee", [])).toBe("policy");
    expect(neoXRpcProfile("eth_call", [{}, "0x1234"])).toBe("historicalCall");
  });

  it("pins every cache layer to no-store for failures and private responses", () => {
    expect(new Set(Object.values(NO_STORE_HEADERS))).toEqual(new Set(["no-store"]));
  });
});
