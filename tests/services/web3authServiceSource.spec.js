import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(process.cwd(), "src/services/web3authService.js"), "utf8");

describe("web3authService source", () => {
  it("uses the low-level auth SDK instead of modal wrappers", () => {
    expect(source).not.toContain('@web3auth/modal');
    expect(source).not.toContain('@web3auth/no-modal');
    expect(source).not.toContain('@web3auth/auth-adapter');
    expect(source).toContain('@web3auth/auth');
  });
});
