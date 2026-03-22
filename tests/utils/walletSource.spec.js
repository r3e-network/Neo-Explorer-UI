import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(process.cwd(), "src/utils/wallet.js"), "utf8");

describe("utils/wallet source", () => {
  it("lazy-loads walletService instead of importing it eagerly", () => {
    expect(source).toMatch(/import\(['"]@\/services\/walletService['"]\)/);
  });
});
