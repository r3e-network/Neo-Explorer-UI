import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("lower-threshold governance lab script", () => {
  const scriptPath = path.resolve(process.cwd(), "scripts/governance-testnet-lower-threshold.js");
  const source = fs.readFileSync(scriptPath, "utf8");

  it("requires the council wif from env instead of hardcoding it", () => {
    expect(source).toContain("TESTNET_COUNCIL_WIF");
    expect(source).not.toContain("Kx2BeyUv1dBr99QtjrRsE7xxQqcHHZJmEWXvV8ivyShgWq7BbA4U");
  });

  it("documents cleanup of temporary multisig request rows", () => {
    expect(source).toContain("multisig_requests");
    expect(source).toContain("multisig_signatures");
    expect(source).toContain("cleanup");
  });
});
