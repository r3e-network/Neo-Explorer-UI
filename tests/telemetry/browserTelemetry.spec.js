import { describe, expect, it } from "vitest";

import {
  buildApiObservationTelemetryContext,
  resolveBrowserObservabilityConfig,
} from "../../src/telemetry/browserTelemetry.js";

describe("resolveBrowserObservabilityConfig", () => {
  it("returns disabled providers when no telemetry env is configured", () => {
    expect(resolveBrowserObservabilityConfig({}, "app.r3e.network")).toEqual({
      sentry: null,
      posthog: null,
    });
  });

  it("builds Sentry and PostHog config from env and suppresses PostHog on localhost by default", () => {
    const config = resolveBrowserObservabilityConfig(
      {
        MODE: "production",
        VITE_APP_RELEASE: "commit-sha-123",
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/123",
        VITE_SENTRY_ENVIRONMENT: "production",
        VITE_SENTRY_TRACES_SAMPLE_RATE: "0.2",
        VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE: "0.05",
        VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: "1.0",
        VITE_POSTHOG_KEY: "phc_test_key",
        VITE_POSTHOG_HOST: "https://us.i.posthog.com",
      },
      "localhost",
    );

    expect(config.sentry).toEqual(
      expect.objectContaining({
        dsn: "https://public@example.ingest.sentry.io/123",
        environment: "production",
        release: "commit-sha-123",
        tracesSampleRate: 0.2,
        replaysSessionSampleRate: 0.05,
        replaysOnErrorSampleRate: 1,
      }),
    );
    expect(config.posthog).toEqual(
      expect.objectContaining({
        key: "phc_test_key",
        api_host: "https://us.i.posthog.com",
        disabled: true,
      }),
    );
  });

  it("maps API observations into Sentry-safe context and tags", () => {
    const telemetry = buildApiObservationTelemetryContext({
      requestId: "req_1",
      traceparent: "00-0123456789abcdef0123456789abcdef-0123456789abcdef-01",
      edgeCache: "HIT",
      neo3furaCache: "MISS",
      explorerCacheStrategy: "edge-short",
      proxyTarget: "rpc.n3index.dev",
      upstreamSource: "neo-go",
      serverTiming: "neo3fura-edge;dur=5",
      source: "rpc",
      method: "POST",
      status: 200,
      url: "/rpc/mainnet/primary",
    });

    expect(telemetry.context).toEqual(
      expect.objectContaining({
        request_id: "req_1",
        edge_cache: "HIT",
        neo3fura_cache: "MISS",
        proxy_target: "rpc.n3index.dev",
        upstream_source: "neo-go",
        server_timing: "neo3fura-edge;dur=5",
      }),
    );
    expect(telemetry.tags).toEqual(
      expect.objectContaining({
        "api.request_id": "req_1",
        "api.trace_id": "0123456789abcdef0123456789abcdef",
        "api.edge_cache": "HIT",
        "api.neo3fura_cache": "MISS",
        "api.source": "rpc",
      }),
    );
  });
});
