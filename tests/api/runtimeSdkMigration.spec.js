import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd());

const readFile = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

describe("runtime SDK migration", () => {
  it("keeps runtime API routes off @cityofzion/neon-js", () => {
    const runtimeFiles = [
      "api/lib/chatAuth.js",
      "api/relayer.js",
      "api/sponsor.js",
    ];

    for (const relativePath of runtimeFiles) {
      const source = readFile(relativePath);
      expect(source).not.toContain("@cityofzion/neon-js");
    }
  });
});
