import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd());
const readFile = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

describe("i18n source", () => {
  it("lazy-loads locale messages instead of importing the full locale index eagerly", () => {
    const i18nSource = readFile("src/lang/i18n.js");

    expect(i18nSource).not.toContain('from "./index.js"');
    expect(i18nSource).toMatch(/import\.meta\.glob|import\(\s*["']\.\/en\.js["']\s*\)/);
  });
});
