import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchWithTimeout } from "../../src/utils/fetchWithTimeout.js";
import {
  __resetApiObservabilityForTests,
  getRecentApiObservations,
} from "../../src/telemetry/apiObservability.js";

describe("fetchWithTimeout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    __resetApiObservabilityForTests();
  });

  it("passes an AbortSignal to fetch", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchWithTimeout("/ok", { headers: { Accept: "application/json" } }, 1000);

    expect(fetchMock).toHaveBeenCalledWith(
      "/ok",
      expect.objectContaining({
        headers: { Accept: "application/json" },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("aborts requests that exceed the timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_input, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => {
        reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
      });
    })));

    const assertion = expect(fetchWithTimeout("/slow", {}, 25)).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(25);

    await assertion;
  });

  it("records API observability headers from completed responses", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", {
      status: 200,
      headers: { "X-Request-Id": "req_fetch_wrapper" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchWithTimeout("/data/mainnet/summary", {}, 1000);

    expect(getRecentApiObservations()).toEqual([
      expect.objectContaining({
        requestId: "req_fetch_wrapper",
        source: "fetch",
        method: "GET",
        url: "/data/mainnet/summary",
      }),
    ]);
  });
});
