import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const multiSigSource = fs.readFileSync(path.resolve(process.cwd(), "src/views/Tools/MultiSigTool.vue"), "utf8");
const governanceSource = fs.readFileSync(path.resolve(process.cwd(), "src/views/Tools/GovernanceTool.vue"), "utf8");

describe("multisig request payload network normalization", () => {
  it("normalizes MultiSigTool request payload network to mainnet/testnet aliases", () => {
    expect(multiSigSource).toMatch(/network:\s*toNetworkMode\(getCurrentEnv\(\)\)\s*\|\|\s*["']mainnet["']/);
  });

  it("normalizes GovernanceTool request payload network to mainnet/testnet aliases", () => {
    expect(governanceSource).toMatch(/network:\s*toNetworkMode\(getCurrentEnv\(\)\)\s*\|\|\s*["']mainnet["']/);
  });
});
