import { describe, it, expect } from "vitest";
import { resolveNeoxSearchLocation } from "@/utils/neoxSearchRouting";

describe("resolveNeoxSearchLocation", () => {
  it("returns the first typed hit's /x route", () => {
    const results = [
      { type: "token", route: "/x/token/0xabc" },
      { type: "address", route: "/x/address/0xdef" },
    ];
    expect(resolveNeoxSearchLocation("wgas", results)).toBe("/x/token/0xabc");
  });

  it("skips malformed hits and uses the first with a route", () => {
    const results = [{ type: "x" }, { route: "" }, { route: "/x/tx/0x1" }];
    expect(resolveNeoxSearchLocation("q", results)).toBe("/x/tx/0x1");
  });

  it("routes a pasted tx hash defensively when search returns nothing", () => {
    const hash = "0x" + "a".repeat(64);
    expect(resolveNeoxSearchLocation(hash, [])).toBe(`/x/tx/${hash}`);
  });

  it("routes a pasted address defensively", () => {
    const addr = "0x" + "b".repeat(40);
    expect(resolveNeoxSearchLocation(addr, null)).toBe(`/x/address/${addr}`);
  });

  it("routes a bare block height defensively", () => {
    expect(resolveNeoxSearchLocation("7164592", [])).toBe("/x/block-info/7164592");
  });

  it("falls through to the neox intent router for prose (the anti-mev regression)", () => {
    const loc = resolveNeoxSearchLocation("anti-mev", []);
    expect(loc).toEqual({ path: "/x/anti-mev" });
  });

  it("resolves a neox entity alias via the intent router", () => {
    const loc = resolveNeoxSearchLocation("跨链桥", null);
    expect(loc).toEqual({ path: "/x/address/0x1212000000000000000000000000000000000004" });
  });

  it("returns null for empty and for unresolvable prose", () => {
    expect(resolveNeoxSearchLocation("", [])).toBeNull();
    expect(resolveNeoxSearchLocation("   ", null)).toBeNull();
    expect(resolveNeoxSearchLocation("zzz nonsense qqq", [])).toBeNull();
  });
});
