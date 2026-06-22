import fs from "node:fs";
import path from "node:path";
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

function createSupabaseInsertMock({ data = { id: "alert-1" }, error = null } = {}) {
  const single = vi.fn(async () => ({ data, error }));
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const from = vi.fn(() => ({ insert }));
  return { from, insert, select, single };
}

describe("network alerts API", () => {
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

  it("validates and inserts alerts server-side", async () => {
    const table = createSupabaseInsertMock();
    const mod = await import("../../api/network_alerts.js");
    const handler = mod.default || mod;
    handler._internal.setSupabaseClientForTests({ from: table.from });

    const req = {
      method: "POST",
      headers: {},
      socket: { remoteAddress: "203.0.113.20" },
      body: {
        network: "mainnet",
        alert_type: "consensus_stuck",
        threshold: 60,
        contact: "NodeOps@Example.com",
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(table.from).toHaveBeenCalledWith("network_alerts");
    expect(table.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        network: "mainnet",
        alert_type: "consensus_stuck",
        threshold: 60,
        contact: "nodeops@example.com",
        is_active: true,
      }),
    ]);
  });

  it("rejects invalid alert targets before storage", async () => {
    const table = createSupabaseInsertMock();
    createClientMock.mockReturnValue({ from: table.from });
    const mod = await import("../../api/network_alerts.js");
    const handler = mod.default || mod;
    const res = createMockRes();

    await handler({
      method: "POST",
      headers: {},
      socket: { remoteAddress: "203.0.113.21" },
      body: {
        network: "testnet",
        alert_type: "consensus_missed",
        target: "not-a-public-key",
        contact: "ops@example.com",
      },
    }, res);

    expect(res.statusCode).toBe(400);
    expect(table.from).not.toHaveBeenCalled();
  });

  it("keeps browser service free of direct network_alerts table writes", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/services/supabaseService.js"), "utf8");
    expect(source).not.toMatch(/\.from\(['"]network_alerts['"]\)\s*[\s\S]{0,80}\.insert/);
    expect(source).toContain("/api/network_alerts");
  });

  it("evaluates missed consensus turns against the latest block height, not the next block count", async () => {
    const updates = [];
    const validators = Array.from({ length: 7 }, (_, i) => ({ publickey: `validator-${i}` }));
    const selectEqNetwork = vi.fn(() => ({
      eq: vi.fn(async () => ({
        data: [
          {
            id: "alert-1",
            network: "mainnet",
            alert_type: "consensus_missed",
            target: "validator-2",
            threshold: 5,
            miss_count: 4,
            last_seen_state: "10900512",
            contact: "ops@example.com",
            is_active: true,
          },
        ],
        error: null,
      })),
    }));
    const select = vi.fn(() => ({ eq: selectEqNetwork }));
    const update = vi.fn((payload) => {
      updates.push(payload);
      return { eq: vi.fn(async () => ({ data: null, error: null })) };
    });
    const supabase = {
      from: vi.fn(() => ({ select, update })),
    };

    vi.stubGlobal("fetch", vi.fn(async (_url, init = {}) => {
      const body = JSON.parse(String(init.body || "{}"));
      if (body.method === "getversion") {
        return new Response(
          JSON.stringify({ jsonrpc: "2.0", id: body.id, result: { protocol: { network: 860833102 } } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (body.method === "getblockcount") {
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: body.id, result: 10900514 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (body.method === "getblock") {
        expect(body.params).toEqual([10900513, 1]);
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: {
              index: 10900513,
              primary: 1,
              time: Date.now(),
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (body.method === "getnextblockvalidators") {
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: body.id, result: validators }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`unexpected RPC method: ${body.method}`);
    }));

    const mod = await import("../../api/check_alerts.js");
    const handler = mod.default || mod;
    handler._internal.setSupabaseClientForTests(supabase);

    await expect(handler._internal.checkNetworkAlerts("mainnet")).resolves.toBe(0);

    expect(updates).toEqual([
      {
        last_seen_state: "10900513",
        miss_count: 4,
      },
    ]);
  });
});
