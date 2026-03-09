import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(process.cwd(), "scripts/root-tools/convert.js"), "utf8");

describe("convert.js script", () => {
  it("uses CommonJS syntax so it can run under the repo root package mode", () => {
    expect(source).not.toMatch(/^import\s/m);
    expect(source).toMatch(/require\(['"]@cityofzion\/neon-js['"]\)/);
  });
});
