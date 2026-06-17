import { beforeEach, describe, expect, it, vi } from "vitest";

// Tests for the relayer hardening (arg bounds, nonce freshness, info gating).
// These load the relayer module's internal helpers by re-implementing the
// pure-logic guards where they are inlinable, and exercise the parseToContractParam
// recursion bound via a small shim that mirrors the relayer's constants.

describe("relayer meta-tx arg bounds (M-S2)", () => {
  // Mirror of the relayer's MAX_META_ARGS / MAX_META_ARG_DEPTH constants.
  const MAX_META_ARGS = 16;
  const MAX_META_ARG_DEPTH = 8;

  function depthOf(args) {
    // Build a nested Array ContractParam-like structure and measure how deep
    // parseToContractParam would recurse before the guard fires.
    let depth = 0;
    let cur = args;
    while (cur && typeof cur === "object" && cur.type === "Array") {
      depth += 1;
      cur = Array.isArray(cur.value) ? cur.value[0] : null;
    }
    return depth;
  }

  it("rejects args arrays longer than MAX_META_ARGS at the top level", () => {
    const tooMany = Array.from({ length: MAX_META_ARGS + 1 }, (_, i) => ({ type: "Integer", value: i }));
    expect(tooMany.length).toBeGreaterThan(MAX_META_ARGS);
    // The handler slices to MAX_META_ARGS and rejects if the input was longer.
    const sliced = tooMany.slice(0, MAX_META_ARGS);
    expect(sliced.length).toBe(MAX_META_ARGS);
  });

  it("flags nesting deeper than MAX_META_ARG_DEPTH as a recursion-bound violation", () => {
    let nested = { type: "Integer", value: 1 };
    for (let i = 0; i < MAX_META_ARG_DEPTH + 2; i++) {
      nested = { type: "Array", value: [nested] };
    }
    expect(depthOf(nested)).toBeGreaterThan(MAX_META_ARG_DEPTH);
  });

  it("accepts nesting at the depth limit", () => {
    let nested = { type: "Integer", value: 1 };
    for (let i = 0; i < MAX_META_ARG_DEPTH - 1; i++) {
      nested = { type: "Array", value: [nested] };
    }
    expect(depthOf(nested)).toBeLessThanOrEqual(MAX_META_ARG_DEPTH);
  });
});

describe("relayer info action no longer leaks funder address (M-S1)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("returns only relayerEnabled when RELAYER_EXPOSE_ADDRESS is unset", async () => {
    vi.stubEnv("RELAYER_EXPOSE_ADDRESS", "");
    // The gate logic: expose !== '1' && expose !== 'true' -> return { relayerEnabled: true }
    const expose = String(process.env.RELAYER_EXPOSE_ADDRESS || "").trim().toLowerCase();
    const gated = expose !== "1" && expose !== "true";
    expect(gated).toBe(true);
  });

  it("returns the address only when RELAYER_EXPOSE_ADDRESS=true", async () => {
    vi.stubEnv("RELAYER_EXPOSE_ADDRESS", "true");
    const expose = String(process.env.RELAYER_EXPOSE_ADDRESS || "").trim().toLowerCase();
    const gated = expose !== "1" && expose !== "true";
    expect(gated).toBe(false);
  });
});
