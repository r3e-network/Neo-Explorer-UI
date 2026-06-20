import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

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
