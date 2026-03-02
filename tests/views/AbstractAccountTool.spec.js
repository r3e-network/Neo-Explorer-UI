import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sourcePath = path.resolve(process.cwd(), "src/views/Tools/AbstractAccountTool.vue");
const source = fs.readFileSync(sourcePath, "utf8");

describe("AbstractAccountTool AA creation invariants", () => {
  it("calls the CreateAccount contract method", () => {
    expect(source).toMatch(/operation:\s*"CreateAccount"/);
  });

  it("sends accountId as ByteArray payload generated from UUID bytes", () => {
    expect(source).toMatch(/const uuidHex = stringToHex\(uuid\.value\)/);
    expect(source).toMatch(/type:\s*"ByteArray",\s*value:\s*uuidHex/);
  });

  it("derives verification script by calling verify(accountId)", () => {
    expect(source).toMatch(/operation:\s*'verify'/);
    expect(source).toMatch(/ContractParam\.byteArray\(uuidHex\)/);
  });
});
