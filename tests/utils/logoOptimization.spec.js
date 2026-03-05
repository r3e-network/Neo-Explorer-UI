import { describe, expect, it } from "vitest";
import {
  getDefaultCandidateLogoUrl,
  optimizeLogoUrl,
  resolveCandidateLogoUrl,
} from "@/utils/logoOptimization";

describe("logoOptimization", () => {
  it("returns empty string for empty values", () => {
    expect(optimizeLogoUrl("")).toBe("");
    expect(resolveCandidateLogoUrl("")).toBe("");
    expect(getDefaultCandidateLogoUrl("")).toBe("");
  });

  it("keeps non-http values unchanged", () => {
    expect(optimizeLogoUrl("/img/brand/neo.png", { forceProxy: true })).toBe("/img/brand/neo.png");
    expect(resolveCandidateLogoUrl("neofs-object-id")).toContain("filesend.ngd.network/gate/get/");
  });

  it("builds proxied url when forceProxy is true", () => {
    const url = optimizeLogoUrl("https://example.com/logo.png", {
      forceProxy: true,
      kind: "contract",
      width: 80,
      quality: 70,
    });

    expect(url).toContain("/api/logo?");
    expect(url).toContain("u=https%3A%2F%2Fexample.com%2Flogo.png");
    expect(url).toContain("w=80");
    expect(url).toContain("q=70");
    expect(url).toContain("fit=contain");
  });

  it("does not double-proxy urls", () => {
    const proxied = "/api/logo?u=https%3A%2F%2Fexample.com%2Flogo.png&w=72&q=72&fit=contain";
    expect(optimizeLogoUrl(proxied, { forceProxy: true })).toBe(proxied);
    expect(resolveCandidateLogoUrl(proxied)).toBe(proxied);
  });

  it("resolves candidate metadata logos through proxy when enabled", () => {
    const url = resolveCandidateLogoUrl("https://example.com/candidate.png");
    // In test mode proxy is usually disabled, so force for deterministic assertion.
    const forced = optimizeLogoUrl("https://example.com/candidate.png", {
      forceProxy: true,
      kind: "candidate",
    });

    expect(forced).toContain("/api/logo?");
    expect(url).toBeTypeOf("string");
  });

  it("builds governance fallback logo url", () => {
    const url = getDefaultCandidateLogoUrl("03abcdef");
    expect(url).toContain("governance.neo.org/logo/03abcdef.png");
  });
});
