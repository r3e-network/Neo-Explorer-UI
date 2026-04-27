import { beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

vi.mock("../../api/lib/telemetry.js", () => ({
  withApiTelemetry: (_name, handler) => handler,
}));

function createMockRes() {
  return {
    headers: {},
    statusCode: 200,
    payload: null,
    setHeader(name, value) {
      this.headers[name] = String(value);
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
}

function createMempoolSelectMock({ data = [{ hash: "0xabc" }], error = null } = {}) {
  const limit = vi.fn(async () => ({ data, error }));
  const order = vi.fn(() => ({ limit }));
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { from, select, eq, order, limit };
}

describe("mempool API", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    const { resetSimpleRateLimitForTests } = await import("../../api/lib/simpleRateLimit.js");
    resetSimpleRateLimitForTests();
  });

  it("loads mempool rows server-side with network and limit validation", async () => {
    const table = createMempoolSelectMock();
    const mod = await import("../../api/mempool.js");
    const handler = mod.default || mod;
    handler._internal.setSupabaseClientForTests({ from: table.from });
    const res = createMockRes();

    await handler({
      method: "GET",
      query: { network: "testnet", limit: "5000" },
      headers: {},
      socket: { remoteAddress: "203.0.113.44" },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(table.from).toHaveBeenCalledWith("mempool_transactions");
    expect(table.eq).toHaveBeenCalledWith("network", "testnet");
    expect(table.limit).toHaveBeenCalledWith(1000);
    expect(res.payload).toEqual({ data: [{ hash: "0xabc" }] });
  });

  it("rejects unsupported networks before storage access", async () => {
    const table = createMempoolSelectMock();
    const mod = await import("../../api/mempool.js");
    const handler = mod.default || mod;
    handler._internal.setSupabaseClientForTests({ from: table.from });
    const res = createMockRes();

    await handler({
      method: "GET",
      query: { network: "staging" },
      headers: {},
      socket: { remoteAddress: "203.0.113.45" },
    }, res);

    expect(res.statusCode).toBe(400);
    expect(table.from).not.toHaveBeenCalled();
  });
});
