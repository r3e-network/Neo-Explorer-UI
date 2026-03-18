import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("mock policy governance lab script", () => {
  const scriptPath = path.resolve(process.cwd(), "scripts/governance-testnet-mock-policy-lab.js");
  const contractPath = path.resolve(process.cwd(), "contracts/MockPolicyLab/MockPolicyLab.cs");
  const scriptSource = fs.readFileSync(scriptPath, "utf8");
  const contractSource = fs.readFileSync(contractPath, "utf8");

  it("requires the council wif from env instead of hardcoding it", () => {
    expect(scriptSource).toContain("TESTNET_COUNCIL_WIF");
    expect(scriptSource).not.toContain("Kx2BeyUv1dBr99QtjrRsE7xxQqcHHZJmEWXvV8ivyShgWq7BbA4U");
  });

  it("defines owner-gated policy-like setters in the mock contract", () => {
    expect(contractSource).toContain("SetFeePerByte");
    expect(contractSource).toContain("SetExecFeeFactor");
    expect(contractSource).toContain("SetStoragePrice");
    expect(contractSource).toContain("Runtime.CheckWitness");
  });

  it("deploys the contract and validates governance storage plus on-chain getters", () => {
    expect(scriptSource).toContain("deployMockPolicyContract");
    expect(scriptSource).toContain("multisig_requests");
    expect(scriptSource).toContain("multisig_signatures");
    expect(scriptSource).toContain("getFeePerByte");
    expect(scriptSource).toContain("getExecFeeFactor");
    expect(scriptSource).toContain("getStoragePrice");
  });
});
