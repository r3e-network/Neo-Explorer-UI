import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);

// There are two rpcEndpoints modules that cannot share a runtime module
// (src/utils/rpcEndpoints.js is ESM bundled by Vite, api/lib/rpcEndpoints.js
// is CJS executed by Vercel functions). This spec is the drift guard: it
// observes each module's network-validation probe behaviorally and asserts
// the two stay in lockstep on network magics, probe timeout, probe request
// body, and the mismatch error-code constant.

// A magic value that cannot match any real Neo network magic, so every probe
// deterministically raises the module's own network-mismatch error.
const WRONG_MAGIC = 12345;

async function probeModule(callWithRpcEndpointFallback, networkValue) {
  const fetchCalls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input, init) => {
      fetchCalls.push({
        method: init?.method,
        contentType: init?.headers?.["Content-Type"],
        body: init?.body,
      });
      return new Response(
        JSON.stringify({ jsonrpc: "2.0", id: 1, result: { protocol: { network: WRONG_MAGIC } } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }),
  );

  // Capture the abort-timer delay the module schedules around its probe.
  const probeDelays = [];
  const originalSetTimeout = globalThis.setTimeout;
  const timeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation((handler, delay, ...args) => {
    if (Number.isFinite(delay) && delay > 0) probeDelays.push(delay);
    return originalSetTimeout(handler, delay, ...args);
  });

  let caught = null;
  try {
    await callWithRpcEndpointFallback(networkValue, async () => {
      throw new Error("handler must not run: the network probe should mismatch first");
    });
  } catch (error) {
    caught = error;
  } finally {
    timeoutSpy.mockRestore();
    vi.unstubAllGlobals();
  }

  return {
    error: caught,
    fetchCalls,
    uniqueProbeDelays: [...new Set(probeDelays)],
  };
}

describe("rpcEndpoints cross-module parity (src ESM vs api CJS)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps network magics, probe timeout, probe body, and mismatch error code in lockstep", async () => {
    const esm = await import("../../src/utils/rpcEndpoints.js");
    const cjs = require("../../api/lib/rpcEndpoints.js");
    cjs.__resetPreferredRpcEndpointsForTests();

    const esmMainnet = await probeModule(esm.callWithRpcEndpointFallback, "mainnet");
    const esmTestnet = await probeModule(esm.callWithRpcEndpointFallback, "testnet");
    const cjsMainnet = await probeModule(cjs.callWithRpcEndpointFallback, "mainnet");
    const cjsTestnet = await probeModule(cjs.callWithRpcEndpointFallback, "testnet");

    // Every probe must have surfaced the module's own mismatch error carrying
    // the injected wrong magic; anything else means the harness observed the
    // wrong code path.
    for (const probe of [esmMainnet, esmTestnet, cjsMainnet, cjsTestnet]) {
      expect(probe.error).toBeTruthy();
      expect(probe.error.actualNetworkMagic).toBe(WRONG_MAGIC);
      expect(probe.fetchCalls.length).toBeGreaterThanOrEqual(1);
    }

    // Network magics: finite, equal across modules per network, distinct per network.
    expect(Number.isFinite(esmMainnet.error.expectedNetworkMagic)).toBe(true);
    expect(Number.isFinite(esmTestnet.error.expectedNetworkMagic)).toBe(true);
    expect(esmMainnet.error.expectedNetworkMagic).toBe(cjsMainnet.error.expectedNetworkMagic);
    expect(esmTestnet.error.expectedNetworkMagic).toBe(cjsTestnet.error.expectedNetworkMagic);
    expect(esmMainnet.error.expectedNetworkMagic).not.toBe(esmTestnet.error.expectedNetworkMagic);

    // Error-code constant(s).
    expect(typeof esmMainnet.error.code).toBe("string");
    expect(esmMainnet.error.code.length).toBeGreaterThan(0);
    expect(esmMainnet.error.code).toBe(cjsMainnet.error.code);
    expect(esmTestnet.error.code).toBe(cjsTestnet.error.code);
    expect(esmMainnet.error.isNetworkMismatch).toBe(true);
    expect(cjsMainnet.error.isNetworkMismatch).toBe(true);

    // Probe request body (plus method and content type) identical everywhere.
    const [reference] = esmMainnet.fetchCalls;
    expect(typeof reference.body).toBe("string");
    for (const probe of [esmMainnet, esmTestnet, cjsMainnet, cjsTestnet]) {
      for (const call of probe.fetchCalls) {
        expect(call.body).toBe(reference.body);
        expect(call.method).toBe(reference.method);
        expect(call.contentType).toBe(reference.contentType);
      }
    }

    // Probe timeout: exactly one distinct abort delay per module, equal across modules.
    expect(esmMainnet.uniqueProbeDelays).toHaveLength(1);
    expect(cjsMainnet.uniqueProbeDelays).toHaveLength(1);
    expect(esmMainnet.uniqueProbeDelays).toEqual(cjsMainnet.uniqueProbeDelays);
    expect(esmTestnet.uniqueProbeDelays).toEqual(cjsTestnet.uniqueProbeDelays);
    expect(esmMainnet.uniqueProbeDelays).toEqual(esmTestnet.uniqueProbeDelays);
  });
});
