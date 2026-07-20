import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const { resetSimpleRateLimitForTests } = require("../../api/lib/simpleRateLimit");

function loadHandler(path) {
  delete require.cache[require.resolve(path)];
  return require(path);
}

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    end(value) {
      this.body = value === undefined ? null : JSON.parse(value);
      return this;
    },
  };
}

function createRequest({ query = {}, method = "GET" } = {}) {
  return {
    method,
    query,
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
  };
}

describe("Neo X REST proxy", () => {
  beforeEach(() => {
    resetSimpleRateLimitForTests();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.fetch;
  });

  it("relays a named network/path rewrite and strips routing parameters", async () => {
    globalThis.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ height: 42 }] }), { status: 200 }));

    const handler = loadHandler("../../api/neox.js");
    const res = createResponse();
    await handler(
      createRequest({ query: { net: "mainnet", path: "blocks/42", type: "block", q: "neo" } }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ items: [{ height: 42 }] });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://xexplorer.neo.org/api/v2/blocks/42?type=block&q=neo",
      expect.objectContaining({ headers: { Accept: "application/json" } })
    );
    expect(res.headers["cache-control"]).toContain("s-maxage=10");
  });

  it("preserves an upstream not-found response as a 404 empty-state signal", async () => {
    globalThis.fetch.mockResolvedValueOnce(new Response("{}", { status: 404 }));

    const handler = loadHandler("../../api/neox.js");
    const res = createResponse();
    await handler(createRequest({ query: { net: "testnet", path: "transactions/0xmissing" } }), res);

    expect(res.statusCode).toBe(404);
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it.each([
    [{ net: "devnet", path: "blocks" }, "Unsupported Neo X network"],
    [{ net: "mainnet", path: "blocks/../secrets" }, "Invalid Neo X path"],
    [{ net: "mainnet", path: "admin" }, "Unsupported Neo X resource"],
  ])("rejects unsafe or unsupported routing input", async (query, message) => {
    const handler = loadHandler("../../api/neox.js");
    const res = createResponse();
    await handler(createRequest({ query }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: message });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("Neo X stats proxy", () => {
  beforeEach(() => {
    resetSimpleRateLimitForTests();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.fetch;
  });

  it("relays an allowlisted chart path and only forwards range filters", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ chart: [{ date: "2026-07-19", value: "1" }] }), { status: 200 })
    );

    const handler = loadHandler("../../api/neox-stats.js");
    const res = createResponse();
    await handler(
      createRequest({
        query: {
          net: "testnet",
          path: "lines/newTxns",
          resolution: "DAY",
          from: "2026-07-01",
          ignored: "value",
        },
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://xt4scan.ngd.network:8080/api/v1/lines/newTxns?resolution=DAY&from=2026-07-01",
      expect.anything()
    );
    expect(res.headers["cache-control"]).toContain("s-maxage=600");
  });

  it("rejects unknown chart paths before contacting the upstream", async () => {
    const handler = loadHandler("../../api/neox-stats.js");
    const res = createResponse();
    await handler(createRequest({ query: { net: "mainnet", path: "lines/not-valid!" } }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Unsupported Neo X stats path" });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
