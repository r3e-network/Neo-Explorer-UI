import { afterEach, describe, expect, it } from "vitest";

import {
  __resetApiObservabilityForTests,
  attachApiObservation,
  getRecentApiObservations,
  recordApiObservation,
  recordApiObservationFromAxios,
  recordApiObservationFromResponse,
} from "../../src/telemetry/apiObservability.js";

describe("apiObservability", () => {
  afterEach(() => {
    __resetApiObservabilityForTests();
  });

  it("records exposed fetch observability headers and parses Server-Timing", () => {
    const response = new Response("{}", {
      status: 200,
      headers: {
        "X-Request-Id": "req_fetch_1",
        traceparent: "00-0123456789abcdef0123456789abcdef-0123456789abcdef-01",
        "X-Edge-Cache": "HIT",
        "X-Neo3fura-Cache": "MISS",
        "Server-Timing": 'neo3fura-cache;desc="hit", neo3fura-edge;dur=5.2',
      },
    });

    const observation = recordApiObservationFromResponse(
      response,
      "/data/mainnet/summary?token=secret&limit=1",
      { method: "GET", source: "indexer" },
    );

    expect(observation).toEqual(
      expect.objectContaining({
        requestId: "req_fetch_1",
        traceparent: "00-0123456789abcdef0123456789abcdef-0123456789abcdef-01",
        edgeCache: "HIT",
        neo3furaCache: "MISS",
        source: "indexer",
        method: "GET",
        status: 200,
        ok: true,
        url: "/data/mainnet/summary?token=redacted&limit=1",
      }),
    );
    expect(observation.serverTimingMetrics).toContainEqual({
      name: "neo3fura-cache",
      description: "hit",
    });
    expect(observation.serverTimingMetrics).toContainEqual({
      name: "neo3fura-edge",
      durationMs: 5.2,
    });
    expect(window.__NEO3FURA_API_OBSERVATIONS__).toHaveLength(1);
  });

  it("records axios response headers case-insensitively", () => {
    const observation = recordApiObservationFromAxios(
      {
        status: 502,
        headers: {
          "X-Request-ID": "req_rpc_1",
          "X-Proxy-Target": "rpc.n3index.dev",
          "x-upstream-source": "neo-go",
        },
        config: {
          method: "post",
          baseURL: "/rpc/mainnet/primary",
          url: "",
        },
      },
      { source: "rpc" },
    );

    expect(observation).toEqual(
      expect.objectContaining({
        requestId: "req_rpc_1",
        proxyTarget: "rpc.n3index.dev",
        upstreamSource: "neo-go",
        source: "rpc",
        method: "POST",
        status: 502,
        ok: false,
        url: "/rpc/mainnet/primary",
      }),
    );
  });

  it("keeps only the latest observations in memory", () => {
    for (let index = 0; index < 35; index += 1) {
      recordApiObservation({ requestId: `req_${index}` });
    }

    const observations = getRecentApiObservations();
    expect(observations).toHaveLength(30);
    expect(observations[0].requestId).toBe("req_5");
    expect(observations[29].requestId).toBe("req_34");
  });

  it("attaches observations to thrown errors for downstream telemetry", () => {
    const error = new Error("failed");
    const observation = { requestId: "req_error" };

    expect(attachApiObservation(error, observation)).toBe(error);
    expect(error.apiObservation).toEqual(observation);
  });
});
