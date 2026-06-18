import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("API request interceptor startup behavior", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("does not block request preparation while endpoint health check is pending", async () => {
    let requestInterceptor;
    const healthCheckDelayMs = 250;

    vi.doMock("axios", () => {
      const instance = {
        post: vi.fn(),
        interceptors: {
          request: {
            use: vi.fn((handler) => {
              requestInterceptor = handler;
            }),
          },
          response: { use: vi.fn() },
        },
      };

      return {
        default: {
          create: vi.fn(() => instance),
          post: vi.fn(),
        },
      };
    });

    vi.doMock("../../src/utils/healthCheck.js", () => ({
      checkAndSetEndpoints: vi.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, healthCheckDelayMs);
          })
      ),
    }));

    await import("../../src/services/api.js");

    expect(typeof requestInterceptor).toBe("function");

    const start = Date.now();
    await requestInterceptor({ headers: {} });
    const elapsedMs = Date.now() - start;

    expect(elapsedMs).toBeLessThan(350);
  });

  it("does not wait for the full health-check duration when startup check is slow", async () => {
    let requestInterceptor;
    const healthCheckDelayMs = 3000;

    vi.doMock("axios", () => {
      const instance = {
        post: vi.fn(),
        interceptors: {
          request: {
            use: vi.fn((handler) => {
              requestInterceptor = handler;
            }),
          },
          response: { use: vi.fn() },
        },
      };

      return {
        default: {
          create: vi.fn(() => instance),
          post: vi.fn(),
        },
      };
    });

    vi.doMock("../../src/utils/healthCheck.js", () => ({
      checkAndSetEndpoints: vi.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, healthCheckDelayMs);
          })
      ),
    }));

    await import("../../src/services/api.js");

    expect(typeof requestInterceptor).toBe("function");

    const start = Date.now();
    await requestInterceptor({ headers: {} });
    const elapsedMs = Date.now() - start;

    // Request preparation should not wait the full startup health check duration.
    expect(elapsedMs).toBeLessThan(1200);
  });

  it("keeps first request startup delay minimal even when health check is still running", async () => {
    let requestInterceptor;
    const healthCheckDelayMs = 3000;

    vi.doMock("axios", () => {
      const instance = {
        post: vi.fn(),
        interceptors: {
          request: {
            use: vi.fn((handler) => {
              requestInterceptor = handler;
            }),
          },
          response: { use: vi.fn() },
        },
      };

      return {
        default: {
          create: vi.fn(() => instance),
          post: vi.fn(),
        },
      };
    });

    vi.doMock("../../src/utils/healthCheck.js", () => ({
      checkAndSetEndpoints: vi.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, healthCheckDelayMs);
          })
      ),
    }));

    await import("../../src/services/api.js");

    expect(typeof requestInterceptor).toBe("function");

    const start = Date.now();
    await requestInterceptor({ headers: {} });
    const elapsedMs = Date.now() - start;

    // Keep first paint snappy: do not block requests on startup probes.
    expect(elapsedMs).toBeLessThan(300);
  });

  it("records RPC observability headers on success and failure responses", async () => {
    let responseInterceptor;
    let responseErrorInterceptor;

    vi.doMock("axios", () => {
      const instance = {
        post: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: {
            use: vi.fn((handler, errorHandler) => {
              responseInterceptor = handler;
              responseErrorInterceptor = errorHandler;
            }),
          },
        },
      };

      return {
        default: {
          create: vi.fn(() => instance),
          post: vi.fn(),
        },
      };
    });

    vi.doMock("../../src/utils/healthCheck.js", () => ({
      checkAndSetEndpoints: vi.fn(() => Promise.resolve()),
    }));

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await import("../../src/services/api.js");
    const { getRecentApiObservations } = await import("../../src/telemetry/apiObservability.js");

    const success = responseInterceptor({
      status: 200,
      headers: {
        "x-request-id": "req_rpc_success",
        "x-edge-cache": "HIT",
      },
      config: {
        method: "post",
        baseURL: "/rpc/mainnet/primary",
        url: "",
      },
    });

    expect(success.apiObservation).toEqual(
      expect.objectContaining({
        requestId: "req_rpc_success",
        edgeCache: "HIT",
        source: "rpc",
      }),
    );

    const error = Object.assign(new Error("upstream failed"), {
      response: {
        status: 503,
        headers: {
          "x-request-id": "req_rpc_error",
          "traceparent": "00-abcdefabcdefabcdefabcdefabcdefab-0123456789abcdef-01",
        },
        config: {
          method: "post",
          baseURL: "/rpc/mainnet/primary",
          url: "",
        },
      },
      config: {
        baseURL: "/rpc/mainnet/primary",
      },
    });

    await expect(responseErrorInterceptor(error)).rejects.toBe(error);
    expect(error.apiObservation).toEqual(
      expect.objectContaining({
        requestId: "req_rpc_error",
        traceparent: "00-abcdefabcdefabcdefabcdefabcdefab-0123456789abcdef-01",
        source: "rpc",
        status: 503,
      }),
    );
    expect(getRecentApiObservations().map((item) => item.requestId)).toEqual([
      "req_rpc_success",
      "req_rpc_error",
    ]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[api] request failed",
      expect.objectContaining({
        requestId: "req_rpc_error",
      }),
    );
  });
});
