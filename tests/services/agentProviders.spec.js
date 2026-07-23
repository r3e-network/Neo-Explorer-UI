import { describe, expect, it } from "vitest";

import { resolveProvider } from "../../src/services/agent/providers.js";

// Contract header names — the wire contract with api/agent.js. Kept here so a
// rename on either side trips a test.
const KEY = "X-Agent-Key";
const MODEL = "X-Agent-Model";
const BASE_URL = "X-Agent-Base-Url";

describe("resolveProvider", () => {
  it("returns hosted with no headers in hosted mode", () => {
    expect(resolveProvider({ mode: "hosted", apiKey: "", model: "", baseUrl: "" })).toEqual({
      mode: "hosted",
      headers: {},
    });
  });

  it("treats missing/empty settings as hosted", () => {
    expect(resolveProvider()).toEqual({ mode: "hosted", headers: {} });
    expect(resolveProvider({})).toEqual({ mode: "hosted", headers: {} });
  });

  it("falls back to hosted when mode is byok but the key is empty", () => {
    expect(resolveProvider({ mode: "byok", apiKey: "" })).toEqual({
      mode: "hosted",
      headers: {},
    });
  });

  it("treats a whitespace-only key as empty (hosted fallback)", () => {
    expect(resolveProvider({ mode: "byok", apiKey: "   " })).toEqual({
      mode: "hosted",
      headers: {},
    });
  });

  it("ignores a key when the mode is not byok", () => {
    expect(resolveProvider({ mode: "hosted", apiKey: "sk-should-be-ignored" })).toEqual({
      mode: "hosted",
      headers: {},
    });
  });

  it("sends only X-Agent-Key when model and base URL are unset", () => {
    expect(resolveProvider({ mode: "byok", apiKey: "sk-user" })).toEqual({
      mode: "byok",
      headers: { [KEY]: "sk-user" },
    });
  });

  it("adds X-Agent-Model only when a model is provided", () => {
    expect(resolveProvider({ mode: "byok", apiKey: "sk-user", model: "claude-x" })).toEqual({
      mode: "byok",
      headers: { [KEY]: "sk-user", [MODEL]: "claude-x" },
    });
  });

  it("adds X-Agent-Base-Url only when a base URL is provided", () => {
    expect(
      resolveProvider({ mode: "byok", apiKey: "sk-user", baseUrl: "https://api.anthropic.com" }),
    ).toEqual({
      mode: "byok",
      headers: { [KEY]: "sk-user", [BASE_URL]: "https://api.anthropic.com" },
    });
  });

  it("sends all three headers when key, model, and base URL are all set", () => {
    expect(
      resolveProvider({
        mode: "byok",
        apiKey: "sk-user",
        model: "claude-x",
        baseUrl: "https://api.deepseek.com/anthropic",
      }),
    ).toEqual({
      mode: "byok",
      headers: {
        [KEY]: "sk-user",
        [MODEL]: "claude-x",
        [BASE_URL]: "https://api.deepseek.com/anthropic",
      },
    });
  });

  it("trims surrounding whitespace from every forwarded value", () => {
    expect(
      resolveProvider({
        mode: "byok",
        apiKey: "  sk-user  ",
        model: "  claude-x  ",
        baseUrl: "  https://api.anthropic.com  ",
      }),
    ).toEqual({
      mode: "byok",
      headers: {
        [KEY]: "sk-user",
        [MODEL]: "claude-x",
        [BASE_URL]: "https://api.anthropic.com",
      },
    });
  });

  it("omits model/baseUrl when they are whitespace-only", () => {
    expect(
      resolveProvider({ mode: "byok", apiKey: "sk-user", model: "   ", baseUrl: "  " }),
    ).toEqual({
      mode: "byok",
      headers: { [KEY]: "sk-user" },
    });
  });

  it("tolerates non-string fields without throwing", () => {
    // A non-string key can never satisfy the presence check → hosted.
    expect(resolveProvider({ mode: "byok", apiKey: 123 })).toEqual({
      mode: "hosted",
      headers: {},
    });
    // Non-string model/baseUrl are simply dropped, not forwarded.
    expect(resolveProvider({ mode: "byok", apiKey: "sk-user", model: 5, baseUrl: null })).toEqual({
      mode: "byok",
      headers: { [KEY]: "sk-user" },
    });
  });

  it("does not mutate the input settings object", () => {
    const frozen = Object.freeze({
      mode: "byok",
      apiKey: "sk-user",
      model: "claude-x",
      baseUrl: "https://api.anthropic.com",
    });
    expect(() => resolveProvider(frozen)).not.toThrow();
    expect(resolveProvider(frozen).headers).not.toBe(frozen);
  });
});
