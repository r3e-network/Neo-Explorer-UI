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

    expect(elapsedMs).toBeLessThan(80);
  });
});
