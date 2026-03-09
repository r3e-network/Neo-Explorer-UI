import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const files = [
  "scripts/root-tools/deploy-test-ecdsa.js",
  "scripts/root-tools/test-ecdsa.js",
  "scripts/root-tools/test-compute-hash.js",
  "scripts/root-tools/test-neo-go-pubkey.js",
];

describe("root ad hoc scripts", () => {
  it("prefer env-configurable RPC URLs over fixed testnet endpoints", () => {
    for (const file of files) {
      const source = fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
      expect(source, file).toMatch(/process\.env\.RPC_URL\s*\|\|/);
    }
  });

  it("does not hardcode testnet network magic in deployment helpers", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "scripts/root-tools/deploy-test-ecdsa.js"), "utf8");
    expect(source).not.toContain("894710606");
    expect(source).toMatch(/getversion|getBlockCount\(\).*getversion|protocol\.network/);
  });
});
