import { describe, expect, it } from "vitest";

import {
  API_DOCS_RPC_CATEGORIES,
  API_DOCS_RPC_METHODS,
  API_DOCS_RPC_PASSTHROUGH_METHODS,
  API_DOCS_RPC_API_BASE_METHODS,
  RPC_METHOD_BASE,
} from "../../src/constants/rpcApiDocs.mjs";

const findMethod = (name) => API_DOCS_RPC_METHODS.find((method) => method.name === name);

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

  it("starts the blocks category with a production-runnable getblockcount example", () => {
    const method = API_DOCS_RPC_METHODS.find((candidate) => candidate.category === "blocks");
    expect(method).toBeTruthy();
    expect(method.name).toBe("getblockcount");
    expect(method.type).toBe("passthrough");
    expect(method.base).toBe(RPC_METHOD_BASE.rpc);
    expect(method.mainnetOnly).toBe(false);
  });

  it("does not expose legacy indexed Get* methods as runnable JSON-RPC examples", () => {
    expect(API_DOCS_RPC_METHODS.some((method) => method.type === "indexed")).toBe(false);
    expect(API_DOCS_RPC_METHODS.some((method) => /^Get/.test(method.name))).toBe(false);
    expect(API_DOCS_RPC_API_BASE_METHODS.size).toBe(0);
  });

  it("keeps the standard NEO-GO invokefunction on the /rpc origin-proxy", () => {
    const method = findMethod("invokefunction");
    expect(method).toBeTruthy();
    expect(method.base).toBe(RPC_METHOD_BASE.rpc);
    expect(method.mainnetOnly).toBe(false);
    expect(API_DOCS_RPC_API_BASE_METHODS.has("invokefunction")).toBe(false);
  });

  it("marks every method with a resolvable base and mainnetOnly flag", () => {
    for (const method of API_DOCS_RPC_METHODS) {
      expect([RPC_METHOD_BASE.rpc, RPC_METHOD_BASE.api]).toContain(method.base);
      expect(typeof method.mainnetOnly).toBe("boolean");
    }
  });
});
