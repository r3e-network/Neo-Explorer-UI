import { describe, expect, it } from "vitest";

import {
  API_DOCS_RPC_CATEGORIES,
  API_DOCS_RPC_METHODS,
  API_DOCS_RPC_PASSTHROUGH_METHODS,
} from "../../src/constants/rpcApiDocs.mjs";

describe("rpcApiDocs catalog", () => {
  it("exports non-empty categories and methods", () => {
    expect(API_DOCS_RPC_CATEGORIES.length).toBeGreaterThan(0);
    expect(API_DOCS_RPC_METHODS.length).toBeGreaterThan(0);
  });

  it("uses unique category keys", () => {
    const keys = API_DOCS_RPC_CATEGORIES.map((category) => category.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("uses unique method names", () => {
    const names = API_DOCS_RPC_METHODS.map((method) => method.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("maps every method to a defined category", () => {
    const categoryKeys = new Set(API_DOCS_RPC_CATEGORIES.map((category) => category.key));
    for (const method of API_DOCS_RPC_METHODS) {
      expect(categoryKeys.has(method.category)).toBe(true);
    }
  });

  it("keeps passthrough type and passthrough list aligned", () => {
    const passthroughNames = API_DOCS_RPC_METHODS.filter((method) => method.type === "passthrough").map(
      (method) => method.name
    );
    expect(new Set(passthroughNames)).toEqual(API_DOCS_RPC_PASSTHROUGH_METHODS);
  });
});
