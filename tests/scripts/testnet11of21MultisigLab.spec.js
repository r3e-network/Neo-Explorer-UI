import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("11-of-21 testnet multisig lab script", () => {
  const scriptPath = path.resolve(process.cwd(), "scripts/governance-testnet-11of21-lab.js");
  const scriptSource = fs.readFileSync(scriptPath, "utf8");

  it("requires the council wif from env instead of hardcoding it", () => {
    expect(scriptSource).toContain("TESTNET_COUNCIL_WIF");
    expect(scriptSource).not.toContain("Kx2BeyUv1dBr99QtjrRsE7xxQqcHHZJmEWXvV8ivyShgWq7BbA4U");
  });

  it("supports preserving Supabase request and signature rows for manual inspection", () => {
    expect(scriptSource).toContain("MULTISIG_11OF21_KEEP_DATA");
    expect(scriptSource).toContain("requestDeleted");
    expect(scriptSource).toContain("signaturesDeleted");
  });

  it("supports optionally funding each generated signer from the council wallet", () => {
    expect(scriptSource).toContain("MULTISIG_11OF21_FUND_EACH_SIGNER");
    expect(scriptSource).toContain("fundedSignerAddresses");
  });

  it("hardcodes the 21 signer / 11 threshold lab shape", () => {
    expect(scriptSource).toContain("const SIGNER_COUNT = 21");
    expect(scriptSource).toContain("const THRESHOLD = 11");
  });
});
