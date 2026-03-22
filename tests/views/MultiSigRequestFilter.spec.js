import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(process.cwd(), "src/views/Tools/MultiSigTool.vue"), "utf8");

describe("MultiSigTool request filtering", () => {
  it("excludes governance requests with the shared governance matcher instead of type-only checks", () => {
    expect(source).toMatch(/filter\(\s*\(request\)\s*=>\s*!isGovernanceRequest\(request,/);
  });
});
