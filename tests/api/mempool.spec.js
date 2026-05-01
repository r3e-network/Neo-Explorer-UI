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

  it("falls back to direct Neo-node RPC and enriches records when Supabase returns empty", async () => {
    const emptyTable = createMempoolSelectMock({ data: [], error: null });

    // Mock the Neo node: getrawmempool returns 2 hashes, getrawtransaction
    // enriches each with tx fields.
    const fetchSpy = vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      if (body.method === "getrawmempool") {
        return new Response(
          JSON.stringify({ jsonrpc: "2.0", id: 1, result: ["0x111", "0x222"] }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (body.method === "getrawtransaction") {
        const [hash] = body.params;
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: {
              hash,
              size: hash === "0x111" ? 250 : 410,
              netfee: hash === "0x111" ? "100000" : "200000",
              sysfee: hash === "0x111" ? "0" : "50000",
              validuntilblock: 9999999,
              signers: [{ account: hash === "0x111" ? "Naddr1" : "Naddr2" }],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("{}", { status: 500 });
    });
    vi.stubGlobal("fetch", fetchSpy);

    vi.stubEnv("VITE_PUBLIC_RPC_BASE_URL_MAINNET", "https://example-rpc.test/mainnet");

    const mod = await import("../../api/mempool.js");
    const handler = mod.default || mod;
    handler._internal.setSupabaseClientForTests({ from: emptyTable.from });
    const res = createMockRes();

    await handler({
      method: "GET",
      query: { network: "mainnet" },
      headers: {},
      socket: { remoteAddress: "203.0.113.46" },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data).toHaveLength(2);
    expect(res.payload.data[0]).toMatchObject({
      hash: "0x111",
      sender: "Naddr1",
      size: 250,
      netfee: 100000,
      status: "pending",
    });
    expect(res.payload.data[1]).toMatchObject({
      hash: "0x222",
      sender: "Naddr2",
      size: 410,
      netfee: 200000,
      sysfee: 50000,
    });
    expect(res.headers["Cache-Control"]).toContain("max-age=2");
  });
});
