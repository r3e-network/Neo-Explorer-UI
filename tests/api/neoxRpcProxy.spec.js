import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const { resetSimpleRateLimitForTests } = require("../../api/lib/simpleRateLimit");

function loadHandler() {
  delete require.cache[require.resolve("../../api/neox-rpc/[net].js")];
  return require("../../api/neox-rpc/[net].js");
}

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    end(value) {
      if (value !== undefined) {
        this.body = JSON.parse(value);
      }
      return this;
    },
  };
}

function createRequest({ net = "mainnet", body, method = "POST", query = {} } = {}) {
  return {
    method,
    query: { net, ...query },
    body,
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
  };
}

describe("neox-rpc proxy", () => {
  beforeEach(() => {
    resetSimpleRateLimitForTests();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.fetch;
  });

  it("relays an allowlisted method with a server-assigned envelope and returns upstream JSON verbatim", async () => {
    const upstreamPayload = { jsonrpc: "2.0", id: 1, result: "0x6d1b05" };
    globalThis.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify(upstreamPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const handler = loadHandler();
    const res = createResponse();
    await handler(createRequest({ body: { method: "eth_blockNumber", params: [] } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(upstreamPayload);
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe("https://mainnet-2.rpc.banelabs.org");
    expect(JSON.parse(init.body)).toEqual({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] });
  });

  it("passes a JSON-RPC error member through on 200 instead of degrading", async () => {
    const upstreamPayload = { jsonrpc: "2.0", id: 1, error: { code: 3, message: "execution reverted" } };
    globalThis.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify(upstreamPayload), { status: 200 })
    );

    const handler = loadHandler();
    const res = createResponse();
    await handler(
      createRequest({ body: { method: "eth_call", params: [{ to: "0x1", data: "0x" }, "latest"] } }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(upstreamPayload);
  });

  it("allows the read-only Neo X Envelope fee policy method", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x0" }), { status: 200 })
    );

    const handler = loadHandler();
    const res = createResponse();
    await handler(createRequest({ method: "GET", query: { method: "eth_envelopeFee" } }), res);

    expect(res.statusCode).toBe(200);
    const [, init] = globalThis.fetch.mock.calls[0];
    expect(JSON.parse(init.body).method).toBe("eth_envelopeFee");
    expect(res.headers["cache-control"]).toContain("max-age=60");
    expect(res.headers["cloudflare-cdn-cache-control"]).toContain("max-age=300");
    expect(res.headers["cloudflare-cdn-cache-control"]).not.toContain("s-maxage");
  });

  it("caches a bounded historical eth_call GET but rejects latest-state calls", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x1234" }), { status: 200 })
    );

    const handler = loadHandler();
    const res = createResponse();
    await handler(createRequest({
      method: "GET",
      query: {
        method: "eth_call",
        to: "0x1212000000000000000000000000000000000001",
        data: "0x9f9d7f81",
        blockTag: "0x6d1b05",
      },
    }), res);

    expect(res.statusCode).toBe(200);
    expect(res.headers["cloudflare-cdn-cache-control"]).toContain("max-age=86400");

    const rejected = createResponse();
    await handler(createRequest({
      method: "GET",
      query: {
        method: "eth_call",
        to: "0x1212000000000000000000000000000000000001",
        data: "0x9f9d7f81",
        blockTag: "latest",
      },
    }), rejected);
    expect(rejected.statusCode).toBe(400);
    expect(rejected.headers["cache-control"]).toBe("no-store");
  });

  it("rejects cache-key pollution and non-allowlisted historical calls", async () => {
    const handler = loadHandler();

    const extraQuery = createResponse();
    await handler(createRequest({
      method: "GET",
      query: { method: "eth_envelopeFee", ignored: "unique-cache-buster" },
    }), extraQuery);
    expect(extraQuery.statusCode).toBe(400);
    expect(extraQuery.headers["cache-control"]).toBe("no-store");

    const repeatedMethod = createResponse();
    await handler(createRequest({
      method: "GET",
      query: { method: ["eth_envelopeFee", "eth_blockNumber"] },
    }), repeatedMethod);
    expect(repeatedMethod.statusCode).toBe(400);

    const arbitraryCall = createResponse();
    await handler(createRequest({
      method: "GET",
      query: {
        method: "eth_call",
        to: "0x1212000000000000000000000000000000000002",
        data: "0x9f9d7f81",
        blockTag: "0x6d1b05",
      },
    }), arbitraryCall);
    expect(arbitraryCall.statusCode).toBe(400);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects non-allowlisted methods before touching the upstream", async () => {
    const handler = loadHandler();
    const res = createResponse();
    await handler(
      createRequest({ body: { method: "eth_sendRawTransaction", params: ["0xdead"] } }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Unsupported RPC method" });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects batch (array) bodies", async () => {
    const handler = loadHandler();
    const res = createResponse();
    await handler(
      createRequest({ body: [{ method: "eth_blockNumber", params: [] }] }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects unknown networks", async () => {
    const handler = loadHandler();
    const res = createResponse();
    await handler(
      createRequest({ net: "devnet", body: { method: "eth_blockNumber", params: [] } }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Unsupported Neo X network" });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects non-array params", async () => {
    const handler = loadHandler();
    const res = createResponse();
    await handler(
      createRequest({ body: { method: "eth_call", params: { to: "0x1" } } }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "RPC params must be an array" });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("caps oversized params payloads", async () => {
    const handler = loadHandler();
    const res = createResponse();
    await handler(
      createRequest({ body: { method: "eth_call", params: [{ data: "0x" + "ff".repeat(30000) }, "latest"] } }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "RPC params too large" });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("only allows GET and POST", async () => {
    const handler = loadHandler();
    const res = createResponse();
    await handler(createRequest({ method: "DELETE" }), res);

    expect(res.statusCode).toBe(405);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("degrades to 502 when the upstream fails", async () => {
    globalThis.fetch.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));

    const handler = loadHandler();
    const res = createResponse();
    await handler(createRequest({ body: { method: "eth_blockNumber", params: [] } }), res);

    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: "Neo X RPC upstream unavailable" });
    expect(res.headers["cache-control"]).toBe("no-store");
  });
});
