import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import messages from "../../src/lang/index.js";

const repoRoot = path.resolve(process.cwd());
const readFile = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const getMessage = (localeMessages, dottedPath) =>
  dottedPath.split(".").reduce((value, key) => value?.[key], localeMessages);

describe("i18n source", () => {
  it("lazy-loads locale messages instead of importing the full locale index eagerly", () => {
    const i18nSource = readFile("src/lang/i18n.js");

    expect(i18nSource).not.toContain('from "./index.js"');
    expect(i18nSource).toMatch(/import\.meta\.glob|import\(\s*["']\.\/en\.js["']\s*\)/);
  });

  it("defines the required API docs messages in every locale", () => {
    const requiredApiDocsKeys = [
      "apiDocsPage.pathParamsHeading",
      "apiDocsPage.queryParamsHeading",
      "apiDocsPage.noRestEndpoints",
      "apiDocsPage.responseHeadersHeading",
      "apiDocsPage.responseHeaders.cache.desc",
      "apiDocsPage.responseHeaders.serverTiming.desc",
    ];

    for (const [locale, localeMessages] of Object.entries(messages)) {
      for (const key of requiredApiDocsKeys) {
        expect(getMessage(localeMessages, key), `${locale}.${key}`).toBeTruthy();
      }
    }
  });
});
