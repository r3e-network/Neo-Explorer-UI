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
      "apiDocsPage.endpointCount",
      "apiDocsPage.methodCount",
      "apiDocsPage.tryItHeading",
      "apiDocsPage.tryItDescription",
      "apiDocsPage.tryItRun",
      "apiDocsPage.tryItRunning",
      "apiDocsPage.tryItRequestUrl",
      "apiDocsPage.tryItRequestBody",
      "apiDocsPage.tryItHttpError",
      "apiDocsPage.tryItTimeout",
      "apiDocsPage.tryItFailed",
      "apiDocsPage.tryItInvalidJson",
    ];

    for (const [locale, localeMessages] of Object.entries(messages)) {
      for (const key of requiredApiDocsKeys) {
        expect(getMessage(localeMessages, key), `${locale}.${key}`).toBeTruthy();
      }
    }
  });

  it("defines the required consensus status messages in every locale", () => {
    const requiredConsensusStatusKeys = [
      "nav.consensusStatus",
      "pageTitles.consensusStatus",
      "pages.consensusStatus.title",
      "pages.consensusStatus.subtitle",
      "pages.consensusStatus.nodesTitle",
      "pages.consensusStatus.legendOk",
      "pages.consensusStatus.legendViewChange",
      "pages.consensusStatus.statusHealthy",
      "pages.consensusStatus.statusDegraded",
      "pages.consensusStatus.slotTitle",
    ];

    for (const [locale, localeMessages] of Object.entries(messages)) {
      for (const key of requiredConsensusStatusKeys) {
        expect(getMessage(localeMessages, key), `${locale}.${key}`).toBeTruthy();
      }
    }
  });

  it("defines an identical set of assistant BYOK settings keys in every locale", () => {
    const requiredSettingsKeys = [
      "open",
      "title",
      "provider",
      "hosted",
      "hostedHelp",
      "byok",
      "byokHelp",
      "apiKey",
      "apiKeyPlaceholder",
      "show",
      "hide",
      "clear",
      "model",
      "modelPlaceholder",
      "baseUrl",
      "baseUrlDefault",
      "remember",
      "rememberHelp",
      "noStore",
      "usingYourKey",
      "usingHosted",
      "done",
    ];
    const expectedKeys = [...requiredSettingsKeys].sort();

    for (const [locale, localeMessages] of Object.entries(messages)) {
      const settings = localeMessages?.agent?.settings;
      expect(settings, `${locale}.agent.settings`).toBeTypeOf("object");

      for (const key of requiredSettingsKeys) {
        const value = getMessage(localeMessages, `agent.settings.${key}`);
        expect(typeof value, `${locale}.agent.settings.${key} type`).toBe("string");
        expect(value.trim(), `${locale}.agent.settings.${key} non-empty`).not.toBe("");
      }

      // No missing and no extra dot-paths — the set is identical across locales.
      expect([...Object.keys(settings)].sort(), `${locale}.agent.settings keys`).toEqual(
        expectedKeys,
      );
    }
  });

  it("defines an identical set of conversation history keys in every locale", () => {
    const requiredHistoryKeys = [
      "open",
      "title",
      "new",
      "empty",
      "untitled",
      "rename",
      "renamePlaceholder",
      "save",
      "cancel",
      "delete",
      "confirmDelete",
      "export",
      "exported",
      "messages",
      "notPersistent",
      "restored",
    ];
    const expectedKeys = [...requiredHistoryKeys].sort();

    for (const [locale, localeMessages] of Object.entries(messages)) {
      const history = localeMessages?.agent?.history;
      expect(history, `${locale}.agent.history`).toBeTypeOf("object");

      for (const key of requiredHistoryKeys) {
        const value = getMessage(localeMessages, `agent.history.${key}`);
        expect(typeof value, `${locale}.agent.history.${key} type`).toBe("string");
        expect(value.trim(), `${locale}.agent.history.${key} non-empty`).not.toBe("");
      }

      // The {n} placeholder must be preserved verbatim in every locale.
      expect(history.messages, `${locale}.agent.history.messages placeholder`).toContain("{n}");

      // No missing and no extra dot-paths — the set is identical across locales.
      expect([...Object.keys(history)].sort(), `${locale}.agent.history keys`).toEqual(
        expectedKeys,
      );
    }
  });
});
