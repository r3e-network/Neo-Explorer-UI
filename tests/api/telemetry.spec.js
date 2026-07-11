import { beforeEach, describe, expect, it, vi } from "vitest";

const initMock = vi.fn();
const captureExceptionMock = vi.fn();
const flushMock = vi.fn().mockResolvedValue(true);
const setTagMock = vi.fn();
const setContextMock = vi.fn();
const withScopeMock = vi.fn((callback) => {
  callback({
    setTag: setTagMock,
    setContext: setContextMock,
  });
});

vi.mock("@sentry/node", () => ({
  default: {
    init: initMock,
    captureException: captureExceptionMock,
    flush: flushMock,
    withScope: withScopeMock,
  },
  init: initMock,
  captureException: captureExceptionMock,
  flush: flushMock,
  withScope: withScopeMock,
}));

describe("api/lib/telemetry", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.SENTRY_DSN = "https://public@example.ingest.sentry.io/123";
    process.env.SENTRY_ENVIRONMENT = "production";
  });

  it("captures thrown handler errors with request context and rethrows", async () => {
    const telemetryModule = await import("../../api/lib/telemetry.js");
    const withApiTelemetry =
      telemetryModule.withApiTelemetry || telemetryModule.default?.withApiTelemetry;

    const err = new Error("boom");
    const wrapped = withApiTelemetry("prices", async () => {
      throw err;
    });

    await expect(
      wrapped(
        {
          method: "GET",
          url: "/api/prices",
          headers: { "x-forwarded-for": "127.0.0.1" },
        },
        {},
      ),
    ).rejects.toThrow("boom");

    expect(initMock).toHaveBeenCalled();
    expect(withScopeMock).toHaveBeenCalled();
    expect(setTagMock).toHaveBeenCalledWith("api.route", "prices");
    expect(captureExceptionMock).toHaveBeenCalledWith(err);
    expect(flushMock).toHaveBeenCalled();
  });

  it("preserves handler metadata used by runtime adapters and tests", async () => {
    const telemetryModule = await import("../../api/lib/telemetry.js");
    const withApiTelemetry =
      telemetryModule.withApiTelemetry || telemetryModule.default?.withApiTelemetry;
    const handler = vi.fn();
    handler._internal = { reset: vi.fn() };

    const wrapped = withApiTelemetry("address-radar", handler);

    expect(wrapped._internal).toBe(handler._internal);
  });
});
