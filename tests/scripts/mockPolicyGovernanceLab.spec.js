import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("mock policy governance lab script", () => {
  const scriptPath = path.resolve(process.cwd(), "scripts/governance-testnet-mock-policy-lab.js");
  const contractPath = path.resolve(process.cwd(), "contracts/MockPolicyLab/MockPolicyLab.cs");
  const neoTokenContractPath = path.resolve(process.cwd(), "contracts/MockNeoTokenLab/MockNeoTokenLab.cs");
  const scriptSource = fs.readFileSync(scriptPath, "utf8");
  const contractSource = fs.readFileSync(contractPath, "utf8");
  const neoTokenContractSource = fs.existsSync(neoTokenContractPath)
    ? fs.readFileSync(neoTokenContractPath, "utf8")
    : "";

  it("requires the council wif from env instead of hardcoding it", () => {
    expect(scriptSource).toContain("TESTNET_COUNCIL_WIF");
    expect(scriptSource).not.toContain("Kx2BeyUv1dBr99QtjrRsE7xxQqcHHZJmEWXvV8ivyShgWq7BbA4U");
  });

  it("defines owner-gated policy-like setters in the mock contract", () => {
    expect(contractSource).toContain("SetFeePerByte");
    expect(contractSource).toContain("SetExecFeeFactor");
    expect(contractSource).toContain("SetStoragePrice");
    expect(contractSource).toContain("SetMillisecondsPerBlock");
    expect(contractSource).toContain("Runtime.CheckWitness");
  });

  it("defines an owner-gated mock NeoToken setter contract", () => {
    expect(neoTokenContractSource).toContain("SetGasPerBlock");
    expect(neoTokenContractSource).toContain("GetGasPerBlock");
    expect(neoTokenContractSource).toContain("Runtime.CheckWitness");
  });

  it("deploys both mock contracts and validates a combined governance proposal plus on-chain getters", () => {
    expect(scriptSource).toContain("deployMockPolicyContract");
    expect(scriptSource).toContain("deployMockNeoTokenContract");
    expect(scriptSource).toContain("multisig_requests");
    expect(scriptSource).toContain("multisig_signatures");
    expect(scriptSource).toContain("setMillisecondsPerBlock");
    expect(scriptSource).toContain("setGasPerBlock");
    expect(scriptSource).toContain("getMillisecondsPerBlock");
    expect(scriptSource).toContain("getGasPerBlock");
  });

  it("supports a generated 21-signer council lab flow that can exclude the funded deployer from the signer set", () => {
    expect(scriptSource).toContain("MOCK_POLICY_LAB_USE_GENERATED_SIGNERS_ONLY");
    expect(scriptSource).toContain("MOCK_POLICY_LAB_EMIT_SIGNER_WIFS");
    expect(scriptSource).toContain("generatedSignerWifs");
    expect(scriptSource).toContain("governanceSignerAccounts");
  });
});
