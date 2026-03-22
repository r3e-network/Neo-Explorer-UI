import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(process.cwd(), "scripts/root-tools/fix-storage-keys.js"), "utf8");

describe("fix-storage-keys script", () => {
  it("does not depend on undeclared glob", () => {
    expect(source).not.toMatch(/require\(['"]glob['"]\)/);
  });
});
