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
    expect(res.headers["cache-control"]).toContain("max-age=30");
    expect(res.headers["cloudflare-cdn-cache-control"]).toContain("max-age=120");
    expect(res.headers["cloudflare-cdn-cache-control"]).toContain("stale-while-revalidate=600");
  });

  it("accepts the bounded cursor fields emitted by token pagination endpoints", async () => {
    globalThis.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 200 }));

    const handler = loadHandler("../../api/neox.js");
    const res = createResponse();
    await handler(
      createRequest({
        query: {
          net: "mainnet",
          path: "tokens/0xtoken/holders",
          address_hash: "0xholder",
          value: "1000000000000000000",
          unique_token: "42",
        },
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://xexplorer.neo.org/api/v2/tokens/0xtoken/holders?address_hash=0xholder&value=1000000000000000000&unique_token=42",
      expect.anything()
    );
  });

  it("forwards the full ERC-1155 batch cursor emitted on batched token-transfer pages", async () => {
    globalThis.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 200 }));

    const handler = loadHandler("../../api/neox.js");
    const res = createResponse();
    await handler(
      createRequest({
        query: {
          net: "mainnet",
          path: "tokens/0xtoken/transfers",
          block_number: "25574433",
          index: "256",
          batch_log_index: "3",
          batch_block_hash: "0xblockhash",
          batch_transaction_hash: "0xtxhash",
          index_in_batch: "7",
        },
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://xexplorer.neo.org/api/v2/tokens/0xtoken/transfers?block_number=25574433&index=256&batch_log_index=3&batch_block_hash=0xblockhash&batch_transaction_hash=0xtxhash&index_in_batch=7",
      expect.anything()
    );
  });

  it("forwards the address-transaction cursor (inserted_at + fee) so account 'load more' advances", async () => {
    globalThis.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 200 }));

    const handler = loadHandler("../../api/neox.js");
    const res = createResponse();
    await handler(
      createRequest({
        query: {
          net: "mainnet",
          path: "addresses/0xabc/transactions",
          block_number: "7042931",
          index: "0",
          hash: "0xcursorhash",
          value: "0",
          inserted_at: "2026-07-10T03:31:13.914135Z",
          fee: "5110160000000000",
          items_count: "50",
        },
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://xexplorer.neo.org/api/v2/addresses/0xabc/transactions?block_number=7042931&index=0&hash=0xcursorhash&value=0&inserted_at=2026-07-10T03%3A31%3A13.914135Z&fee=5110160000000000&items_count=50",
      expect.anything()
    );
  });

  it("forwards the state-changes cursor (state_changes offset) so state-changes 'load more' advances", async () => {
    globalThis.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 200 }));

    const handler = loadHandler("../../api/neox.js");
    const res = createResponse();
    await handler(
      createRequest({
        query: {
          net: "mainnet",
          path: "transactions/0xtx/state-changes",
          state_changes: "50",
          items_count: "50",
        },
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://xexplorer.neo.org/api/v2/transactions/0xtx/state-changes?state_changes=50&items_count=50",
      expect.anything()
    );
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
    [{ net: "mainnet", path: "blocks", cache_buster: "unbounded" }, "Unsupported Neo X query"],
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
        },
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://xt4scan.ngd.network:8080/api/v1/lines/newTxns?resolution=DAY&from=2026-07-01",
      expect.anything()
    );
    expect(res.headers["cache-control"]).toContain("max-age=300");
    expect(res.headers["cloudflare-cdn-cache-control"]).toContain("max-age=3600");
  });

  it("rejects unknown chart paths before contacting the upstream", async () => {
    const handler = loadHandler("../../api/neox-stats.js");
    const res = createResponse();
    await handler(createRequest({ query: { net: "mainnet", path: "lines/not-valid!" } }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Unsupported Neo X stats path" });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects unknown stats query keys before they can pollute the CDN cache", async () => {
    const handler = loadHandler("../../api/neox-stats.js");
    const res = createResponse();
    await handler(
      createRequest({ query: { net: "mainnet", path: "lines/newTxns", resolution: "DAY", nonce: "unique" } }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
