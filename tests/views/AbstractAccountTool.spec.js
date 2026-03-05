import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sourcePath = path.resolve(process.cwd(), "src/views/Tools/AbstractAccountTool.vue");
const source = fs.readFileSync(sourcePath, "utf8");

describe("AbstractAccountTool AA creation invariants", () => {
  it("calls the lowercase createAccountWithAddress contract method", () => {
    expect(source).toMatch(/operation:\s*['"]createAccountWithAddress['"]/);
    expect(source).not.toMatch(/operation:\s*['"]CreateAccount['"]/);
  });

  it("sends accountId bytes with bound AA account hash160", () => {
    expect(source).toMatch(/const accountIdHex = normalizeAccountId\(uuid\.value\)/);
    expect(source).toMatch(/type:\s*"ByteArray",\s*value:\s*accountIdHex/);
    expect(source).toMatch(/type:\s*"Hash160",\s*value:\s*normalizeAddress\(computedAddress\.value\)/);
  });

  it("derives verification script by calling verify(accountId)", () => {
    expect(source).toMatch(/operation:\s*'verify'/);
    expect(source).toMatch(/ContractParam\.byteArray\(.*accountIdHex.*\)/);
  });
});
