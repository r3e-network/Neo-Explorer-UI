import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rootToolsDir = path.resolve(process.cwd(), "scripts/root-tools");
const rootWrapperFiles = [
  "convert.js",
  "deploy-test-ecdsa.js",
  "fix-storage-keys.js",
  "patch-wallet.js",
  "register_domains.js",
  "test-compute-hash.js",
  "test-ecdsa.js",
  "test-neo-go-pubkey.js",
];

describe("root tools package", () => {
  it("provides an isolated scripts/root-tools package manifest", () => {
    const pkgPath = path.join(rootToolsDir, "package.json");
    expect(fs.existsSync(pkgPath)).toBe(true);
  });

  it("keeps root script entrypoints as thin wrappers into scripts/root-tools", () => {
    for (const file of rootWrapperFiles) {
      const source = fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
      expect(source, file).toMatch(/scripts\/root-tools/);
    }
  });
});
