import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_EXTENSIONS = new Set([".js", ".vue"]);
const SERVICES_BARREL_RE = /from\s+["']@\/services["']|import\(["']@\/services["']\)/;

function collectSourceFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("service imports", () => {
  it("imports frontend services from concrete modules instead of the barrel", () => {
    const srcDir = path.resolve(process.cwd(), "src");
    const offenders = collectSourceFiles(srcDir)
      .filter((file) => !file.endsWith(path.join("src", "services", "index.js")))
      .filter((file) => SERVICES_BARREL_RE.test(fs.readFileSync(file, "utf8")))
      .map((file) => path.relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});
