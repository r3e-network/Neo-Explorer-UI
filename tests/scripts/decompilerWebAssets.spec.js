import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("decompiler web wasm assets", () => {
  it("copies wasm-pack assets into the runtime path after build", () => {
    const packageJson = JSON.parse(readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"));
    const script = readFileSync(
      path.resolve(process.cwd(), "scripts/copy-decompiler-web-assets.mjs"),
      "utf8",
    );

    expect(packageJson.scripts.postbuild).toBe("node scripts/copy-decompiler-web-assets.mjs");
    expect(script).toContain("neo-decompiler-web");
    expect(script).toContain('"dist", "pkg"');
    expect(script).toContain('"dist", "assets", "pkg"');
  });
});
