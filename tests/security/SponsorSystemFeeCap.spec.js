import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Backend info-action mocks (audit finding #3) -------------------------
// The sponsor handler resolves the sponsor account via a dynamic import of the
// runtime SDK; mock it so `new wallet.Account(wif)` is deterministic and the
// heavy neon path never loads for the lightweight info action.
const SPONSOR_ADDRESS = "Nff6xLFw4QzQmMKhj5wqj9f7j8Ue8q4yrS";
const SPONSOR_SCRIPT_HASH = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";

vi.mock("@r3e/neo-js-sdk/browser", () => {
  class Account {
    constructor() {
      this.address = SPONSOR_ADDRESS;
      this.scriptHash = SPONSOR_SCRIPT_HASH;
    }
  }
  return { wallet: { Account }, tx: {}, rpc: {}, sc: {} };
});

// Keep the info action hermetic: always allow through the rate limiter.
vi.mock("../../api/lib/relayerRateLimit.js", () => ({
  enforceRelayerRateLimit: vi.fn(async () => true),
}));

// Regression guard for the sponsor gas-drain fix.
//
// In Neo N3 the sender (here the sponsor, signer[0]) is charged the FULL declared
// SystemFee embedded in the transaction — unconsumed gas is burned, not refunded.
// sponsor.js broadcasts a client-supplied, user-signed transaction as-is, so it
// cannot rebuild the tx with a server-controlled systemFee the way relayer.js does
// (that would invalidate the user's witness). The only correct defense is to
// reject when the embedded declared systemFee exceeds the cap. The simulation
// `gasconsumed` check is NOT sufficient on its own because it bounds execution
// cost, not the declared amount actually charged.
const sponsorPath = path.resolve(process.cwd(), "api/sponsor.js");
const sponsorSource = fs.readFileSync(sponsorPath, "utf8");

describe("sponsor.js systemFee gas-drain guard", () => {
  it("caps the declared systemFee embedded in the client transaction", () => {
    expect(sponsorSource).toMatch(
      /BigInt\(String\(transaction\.systemFee[^)]*\)\)\s*>\s*getMaxSystemFee\(\)/,
    );
    expect(sponsorSource).toMatch(/System fee too high/);
  });

  it("rejects the over-cap systemFee BEFORE signing the transaction", () => {
    const systemFeeGuardIndex = sponsorSource.indexOf("transaction.systemFee");
    const signIndex = sponsorSource.indexOf("transaction.sign(");
    expect(systemFeeGuardIndex).toBeGreaterThan(-1);
    expect(signIndex).toBeGreaterThan(-1);
    // The declared-fee guard must run before the sponsor witness is produced,
    // otherwise the sponsor has already committed to paying the inflated fee.
    expect(systemFeeGuardIndex).toBeLessThan(signIndex);
  });

  it("still bounds the simulated execution cost as a secondary guard", () => {
    expect(sponsorSource).toMatch(/BigInt\(String\(invokeRes\.gasconsumed[^)]*\)\)/);
    expect(sponsorSource).toMatch(/systemFee\s*>\s*getMaxSystemFee\(\)/);
  });
});

// Audit finding #3: `action:info` must ALWAYS return the sponsor address when
// the feature is enabled. It was previously hidden behind SPONSOR_EXPOSE_ADDRESS
// (which nothing sets), so SponsoredTool built signer[0] from
// new Account(undefined) — a RANDOM account — and every sponsored tx died with
// "First signer must be the sponsor account" after a real wallet signature.
describe("sponsor.js action:info exposes the sponsor address (finding #3)", () => {
  function mockRes() {
    return {
      statusCode: 200,
      payload: null,
      headers: {},
      setHeader(name, value) {
        this.headers[name] = String(value);
        return this;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.payload = body;
        return this;
      },
    };
  }

  function infoReq() {
    return {
      method: "POST",
      headers: {},
      socket: { remoteAddress: "203.0.113.9" },
      body: { action: "info", network: "mainnet", userAddress: "" },
    };
  }

  async function loadHandler() {
    const mod = await import("../../api/sponsor.js");
    return mod.default;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("SPONSOR_ENABLED", "true");
    vi.stubEnv("SPONSORED_WIF", "L1abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMN");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the sponsor address WITHOUT requiring SPONSOR_EXPOSE_ADDRESS", async () => {
    // Explicitly leave SPONSOR_EXPOSE_ADDRESS unset — the previous default.
    const handler = await loadHandler();
    const res = mockRes();
    await handler(infoReq(), res);

    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({
      sponsorEnabled: true,
      sponsorAddress: SPONSOR_ADDRESS,
    });
    // The scriptHash the client needs to build signer[0] is also returned.
    expect(res.payload.sponsorScriptHash).toBe(SPONSOR_SCRIPT_HASH);
  });

  it("still refuses the info action when the feature is disabled", async () => {
    vi.stubEnv("SPONSOR_ENABLED", "false");
    const handler = await loadHandler();
    const res = mockRes();
    await handler(infoReq(), res);

    expect(res.statusCode).toBe(503);
    expect(res.payload?.sponsorAddress).toBeUndefined();
  });
});
