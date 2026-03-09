import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(process.cwd(), "src/utils/wallet.js"), "utf8");

describe("utils/wallet source", () => {
  it("does not dynamically import walletService when it is already statically imported", () => {
    expect(source).not.toMatch(/import\(['"]@\/services\/walletService['"]\)/);
  });
});
