import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const projectPath = path.resolve(repoRoot, "contracts/AbstractAccount/AbstractAccount.csproj");
const checkedManifestPath = path.resolve(repoRoot, "contracts/AbstractAccount/bin/sc/UnifiedSmartWalletV2.manifest.json");

function compileManifestToTemp() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aa-artifacts-"));
  const cmd = `~/.dotnet/tools/nccs ${projectPath} -o ${tempDir} --base-name UnifiedSmartWalletV2`;
  execSync(cmd, { stdio: "pipe", shell: "/bin/bash" });
  const manifestPath = path.join(tempDir, "UnifiedSmartWalletV2.manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  return { tempDir, manifest };
}

function getMethod(manifest, name) {
  return manifest?.abi?.methods?.find((method) => method.name === name);
}

function compactAbi(manifest) {
  return (manifest?.abi?.methods || []).map((method) => ({
    name: method.name,
    params: (method.parameters || []).map((param) => `${param.name}:${param.type}`),
    returntype: method.returntype,
    safe: !!method.safe,
  }));
}

describe("UnifiedSmartWallet compiled artifact behavior", () => {
  it("compiler output contains hardened meta-tx ABI shape", () => {
    const { tempDir, manifest } = compileManifestToTemp();
    try {
      const executeMetaTx = getMethod(manifest, "executeMetaTx");
      const executeMetaTxByAddress = getMethod(manifest, "executeMetaTxByAddress");
      const computeArgsHash = getMethod(manifest, "computeArgsHash");
      const getNonceForAccount = getMethod(manifest, "getNonceForAccount");
      const getNonceForAddress = getMethod(manifest, "getNonceForAddress");
      const getAccountIdByAddress = getMethod(manifest, "getAccountIdByAddress");

      expect(executeMetaTx).toBeTruthy();
      expect(executeMetaTx.parameters.map((param) => `${param.name}:${param.type}`)).toEqual([
        "accountId:ByteArray",
        "uncompressedPubKey:ByteArray",
        "targetContract:Hash160",
        "method:String",
        "args:Array",
        "argsHash:ByteArray",
        "nonce:Integer",
        "deadline:Integer",
        "signature:ByteArray",
      ]);
      expect(executeMetaTxByAddress).toBeTruthy();
      expect(executeMetaTxByAddress.parameters.map((param) => `${param.name}:${param.type}`)).toEqual([
        "accountAddress:Hash160",
        "uncompressedPubKey:ByteArray",
        "targetContract:Hash160",
        "method:String",
        "args:Array",
        "argsHash:ByteArray",
        "nonce:Integer",
        "deadline:Integer",
        "signature:ByteArray",
      ]);

      expect(computeArgsHash).toBeTruthy();
      expect(computeArgsHash.safe).toBe(true);
      expect(getNonceForAccount).toBeTruthy();
      expect(getNonceForAddress).toBeTruthy();
      expect(getAccountIdByAddress).toBeTruthy();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }, 20000);

  it("checked-in manifest stays in sync with compiler output ABI", () => {
    const checkedManifest = JSON.parse(fs.readFileSync(checkedManifestPath, "utf8"));
    const { tempDir, manifest } = compileManifestToTemp();
    try {
      expect(compactAbi(checkedManifest)).toEqual(compactAbi(manifest));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }, 20000);
});
