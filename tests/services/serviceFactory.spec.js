import { describe, it, expect, vi } from "vitest";

vi.mock("./api", () => ({
  safeRpc: vi.fn((_method, _params, fallback) => Promise.resolve(fallback)),
  safeRpcList: vi.fn(() => Promise.resolve({ result: [], totalCount: 0 })),
}));
vi.mock("./cache", () => ({
  cachedRequest: vi.fn((_key, fetchFn) => fetchFn()),
  getCacheKey: vi.fn((method, params) => `${method}:${JSON.stringify(params)}`),
  CACHE_TTL: { block: 15000, chart: 300000 },
}));
vi.mock("../utils/env", () => ({
  getNetworkRefreshIntervalMs: () => 15000,
}));

import {
  createRpcMethod,
  createRpcListMethod,
  createService,
  getRealtimeListCacheOptions,
} from "@/services/serviceFactory";

describe("serviceFactory", () => {
  describe("getRealtimeListCacheOptions", () => {
    it("returns SWR defaults", () => {
      const opts = getRealtimeListCacheOptions();
      expect(opts.staleWhileRevalidate).toBe(true);
      expect(opts.softTtl).toBe(15000);
      expect(opts.throwOnError).toBe(true);
    });

    it("merges custom options", () => {
      const opts = getRealtimeListCacheOptions({ throwOnError: false });
      expect(opts.throwOnError).toBe(false);
      expect(opts.staleWhileRevalidate).toBe(true);
    });
  });

  describe("createRpcMethod", () => {
    it("creates a callable async function", () => {
      const method = createRpcMethod({
        cacheKey: "test",
        rpcMethod: "TestMethod",
        buildParams: ([id]) => ({ id }),
      });
      expect(typeof method).toBe("function");
    });

    it("returns fallback value on call", async () => {
      const method = createRpcMethod({
        cacheKey: "test",
        rpcMethod: "TestMethod",
        fallback: { empty: true },
        buildParams: ([id]) => ({ id }),
      });
      const result = await method("abc");
      expect(result).toEqual({ empty: true });
    });
  });

  describe("createRpcListMethod", () => {
    it("creates a callable async function", () => {
      const method = createRpcListMethod({
        cacheKey: "test_list",
        rpcMethod: "TestListMethod",
        errorLabel: "test",
        buildParams: ([limit, skip]) => ({ limit, skip }),
      });
      expect(typeof method).toBe("function");
    });
  });

  describe("createService", () => {
    it("builds a service object from method configs", () => {
      const service = createService({
        getItem: {
          cacheKey: "item",
          rpcMethod: "GetItem",
          buildParams: ([id]) => ({ id }),
        },
        getList: {
          _type: "list",
          cacheKey: "items",
          rpcMethod: "GetItems",
          errorLabel: "items",
          buildParams: ([limit, skip]) => ({ limit, skip }),
        },
      });
      expect(typeof service.getItem).toBe("function");
      expect(typeof service.getList).toBe("function");
    });

    it("applies overrides", () => {
      const customFn = vi.fn(() => "custom");
      const service = createService({}, { customMethod: customFn });
      expect(service.customMethod()).toBe("custom");
    });
  });
});
