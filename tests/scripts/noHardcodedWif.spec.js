import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const files = [
  "scripts/root-tools/deploy-test-ecdsa.js",
  "contracts/NameService/deploy_mainnet.js",
  "contracts/NameService/deploy_testnet.js",
];

const WIF_PATTERN = /["']([KL5][1-9A-HJ-NP-Za-km-z]{50,51})["']/;

describe("deployment scripts", () => {
  it("do not contain hardcoded WIF secrets", () => {
    for (const file of files) {
      const source = fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
      expect(source, file).not.toMatch(WIF_PATTERN);
    }
  });
});
