import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/lib/telemetry.js", () => ({
  withApiTelemetry: (_name, handler) => handler,
}));

const CENTER = "Ncenter111111111111111111111111111111";
const ALICE = "NAlice1111111111111111111111111111111";
const BOB = "NBob11111111111111111111111111111111";
const TARGET = "NTarget11111111111111111111111111111";

function createMockRes() {
  return {
    headers: {},
    statusCode: 200,
    payload: null,
    body: "",
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
    end(chunk = "") {
      this.body += chunk;
      this.payload = chunk ? JSON.parse(chunk) : null;
      return this;
    },
  };
}

function request(query = {}) {
  return {
    method: "GET",
    query,
    headers: {},
    socket: { remoteAddress: "203.0.113.88" },
  };
}

function jsonResponse(rows) {
  return new Response(JSON.stringify(rows), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function addressFromRadarUrl(url) {
  const parsed = new URL(String(url));
  return decodeURIComponent(parsed.searchParams.get("or") || "");
}

function queryParam(url, name) {
  return new URL(String(url)).searchParams.get(name) || "";
}

describe("address radar API", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    const { resetSimpleRateLimitForTests } = await import("../../api/lib/simpleRateLimit.js");
    resetSimpleRateLimitForTests();
  });

  it("builds a capped direct graph server-side", async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes("/accounts/")) {
        return jsonResponse([
          {
            txid: "0x-in",
            block_index: 20,
            from_address: ALICE,
            to_address: CENTER,
            contract_hash: "0xd2a4",
            amount_text: "1",
          },
          {
            txid: "0x-out",
            block_index: 19,
            from_address: CENTER,
            to_address: BOB,
            contract_hash: "0xef40",
            amount_text: "2",
          },
        ]);
      }
      return jsonResponse([]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const mod = await import("../../api/address-radar.js");
    const handler = mod.default || mod;
    const res = createMockRes();

    await handler(request({ mode: "direct", network: "mainnet", address: CENTER, limit: "9999" }), res);

    expect(res.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(decodeURIComponent(String(fetchMock.mock.calls[0][0]))).toContain(`/networks/mainnet/accounts/${CENTER}/transfers`);
    expect(decodeURIComponent(String(fetchMock.mock.calls[0][0]))).toContain("limit=80");
    expect(res.payload.data.graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ address: CENTER, role: "center" }),
        expect.objectContaining({ address: ALICE, role: "source" }),
        expect.objectContaining({ address: BOB, role: "sink" }),
      ]),
    );
    expect(res.payload.data.graph.summary).toMatchObject({
      inboundAccounts: 1,
      outboundAccounts: 1,
      transferCount: 2,
    });
    expect(res.payload.data.limits.transferLimit).toBe(80);
    expect(res.headers["Cache-Control"]).toContain("s-maxage=30");
  });

  it("retries transient direct transfer source failures before returning a graph", async () => {
    let nep17Calls = 0;
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes("nep17_transfers")) {
        nep17Calls += 1;
        if (nep17Calls === 1) throw new DOMException("The operation was aborted", "AbortError");
        return jsonResponse([
          {
            txid: "0x-retry",
            block_index: 21,
            from_address: ALICE,
            to_address: CENTER,
            contract_hash: "0xgas",
            amount_text: "1",
          },
        ]);
      }
      return jsonResponse([]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const mod = await import("../../api/address-radar.js");
    const handler = mod.default || mod;
    const res = createMockRes();

    await handler(request({ mode: "direct", network: "mainnet", address: CENTER, limit: "80" }), res);

    expect(res.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(res.payload.data.graph.summary).toMatchObject({
      inboundAccounts: 1,
      transferCount: 1,
    });
    expect(res.payload.data.graph.edges[0]).toMatchObject({ txHashes: ["0x-retry"] });
  });

  it("does not mask partial source failures as an empty direct graph", async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes("nep17_transfers")) {
        throw new DOMException("The operation was aborted", "AbortError");
      }
      return jsonResponse([]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const mod = await import("../../api/address-radar.js");
    const handler = mod.default || mod;
    const res = createMockRes();

    await handler(request({ mode: "direct", network: "mainnet", address: CENTER, limit: "80" }), res);

    expect(res.statusCode).toBe(502);
    expect(res.payload.error).toBe("Address radar data is unavailable.");
    expect(res.payload.data).toBeUndefined();
  });

  it("finds paths with bounded depth and per-address fanout", async () => {
    const fetchMock = vi.fn(async (url) => {
      const addressFilter = addressFromRadarUrl(url);
      if (String(url).includes("nep11_transfers")) return jsonResponse([]);
      if (addressFilter.includes(CENTER)) {
        return jsonResponse([{ txid: "0x-a", block_index: 30, from_address: CENTER, to_address: ALICE, contract_hash: "0xgas" }]);
      }
      if (addressFilter.includes(ALICE)) {
        return jsonResponse([{ txid: "0x-b", block_index: 29, from_address: ALICE, to_address: TARGET, contract_hash: "0xgas" }]);
      }
      return jsonResponse([]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const mod = await import("../../api/address-radar.js");
    const handler = mod.default || mod;
    const res = createMockRes();

    await handler(
      request({
        mode: "path",
        network: "mainnet",
        source: CENTER,
        target: TARGET,
        depth: "99",
        perAddressLimit: "5000",
      }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.result).toMatchObject({ found: true, depth: 2 });
    expect(res.payload.data.graph.edges.map((edge) => edge.txHashes[0])).toEqual(["0x-a", "0x-b"]);
    expect(res.payload.data.limits).toMatchObject({
      maxDepth: 3,
      maxVisited: 36,
      perAddressLimit: 18,
      concurrency: 4,
    });
    for (const [url] of fetchMock.mock.calls) {
      const decoded = decodeURIComponent(String(url));
      if (decoded.includes("from_address=eq.") && decoded.includes("to_address=eq.")) {
        expect(decoded).toContain("limit=8");
      } else {
        expect(decoded).toContain("limit=18");
      }
    }
  });

  it("checks a targeted source-target edge before sampled path fanout", async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes("nep11_transfers")) return jsonResponse([]);
      if (queryParam(url, "from_address") === `eq.${CENTER}` && queryParam(url, "to_address") === `eq.${TARGET}`) {
        return jsonResponse([
          {
            txid: "0x-direct-targeted",
            block_index: 31,
            from_address: CENTER,
            to_address: TARGET,
            contract_hash: "0xgas",
          },
        ]);
      }
      return jsonResponse([]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const mod = await import("../../api/address-radar.js");
    const handler = mod.default || mod;
    const res = createMockRes();

    await handler(
      request({
        mode: "path",
        network: "mainnet",
        source: CENTER,
        target: TARGET,
        depth: "3",
      }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.result).toMatchObject({ found: true, depth: 1 });
    expect(res.payload.data.graph.edges[0]).toMatchObject({ txHashes: ["0x-direct-targeted"] });
    expect(fetchMock.mock.calls.some(([url]) => queryParam(url, "from_address") === `eq.${CENTER}`)).toBe(true);
  });

  it("rejects invalid requests before touching the indexer", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const mod = await import("../../api/address-radar.js");
    const handler = mod.default || mod;
    const res = createMockRes();

    await handler(request({ mode: "direct", network: "staging", address: CENTER }), res);

    expect(res.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
