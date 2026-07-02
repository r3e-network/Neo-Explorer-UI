import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Guards the multisig list endpoint's projection + pagination contract:
//  - the DEFAULT response is a bounded summary projection (no witness /
//    unsigned_tx / signature_metadata blobs, signatures reduced to
//    {id, signer_address}) so the unauthenticated board polls stay far away
//    from Vercel's ~4.5MB response cap;
//  - `?full=1` preserves today's full row + full signature shape verbatim for
//    migration safety;
//  - limit/offset/status are validated and capped.
//
// The projection itself is computed by Postgres, so these tests pin the SQL
// the handler sends (strip expressions present, blob columns absent) plus the
// row unwrapping; the jsonb semantics of the strip expressions were verified
// against a live Postgres 17 when this projection was introduced.
//
// Like api/multisig/requests/[id].js, the handler's CJS require()s are not
// instrumented by the vitest/Vite module graph, so the db dependency is
// injected through the handler's _internal seam instead of vi.mock.

const queryMock = vi.fn();

function mockRes() {
  return {
    statusCode: 200,
    payload: null,
    headers: {},
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
    end() {
      this.ended = true;
      return this;
    },
  };
}

function getReq(query = {}) {
  return { method: "GET", headers: {}, query };
}

async function loadHandler() {
  const mod = await import("../../api/multisig/requests.js");
  const handler = mod.default;
  handler._internal.setDepsForTests({ query: queryMock });
  return handler;
}

const PROJECTED_ROW = {
  id: 7,
  title: "Proposal",
  description: "desc",
  status: "PENDING",
  network: "mainnet",
  network_mode: "mainnet",
  method: "vote",
  contract_hash: "0xabc",
  creator_address: "Ncreator",
  created_at: "2026-07-01T00:00:00+00:00",
  signers_required: 3,
  params: { hash: "0x123", committee_pubkeys: ["p1", "p2"], governance_mode: "official" },
  metadata: { offchain_packet_only: false, signatures_collected: 1 },
  signatures: [{ id: 10, signer_address: "Na" }],
};

describe("api/multisig/requests GET (projected default)", () => {
  let handler;

  beforeEach(async () => {
    vi.clearAllMocks();
    queryMock.mockResolvedValue({ rows: [{ request: PROJECTED_ROW }] });
    handler = await loadHandler();
  });

  afterEach(() => {
    handler?._internal?.resetDepsForTests();
  });

  it("returns the unwrapped projected rows with no witness/unsigned_tx blobs", async () => {
    const res = mockRes();
    await handler(getReq(), res);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.payload)).toBe(true);
    expect(res.payload).toEqual([PROJECTED_ROW]);

    const row = res.payload[0];
    expect(row.unsigned_tx).toBeUndefined();
    expect(row.params.unsigned_tx).toBeUndefined();
    expect(row.params.signature_metadata).toBeUndefined();
    expect(row.signatures[0]).toEqual({ id: 10, signer_address: "Na" });
    expect(row.signatures[0].witness).toBeUndefined();
    expect(row.signatures[0].signature).toBeUndefined();
  });

  it("sends a projection query that strips the blob fields in SQL and keeps created_at desc ordering", async () => {
    const res = mockRes();
    await handler(getReq(), res);

    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql] = queryMock.mock.calls[0];

    // Row-level blob strip + params/metadata strips happen in Postgres.
    expect(sql).toContain("to_jsonb(r) - 'unsigned_tx'");
    expect(sql).toContain("- 'signature_metadata'");
    expect(sql).toContain("- 'committee_verification_script'");
    expect(sql).toContain("- 'broadcast_witness'");
    // Signatures relation reduced to id + signer_address only.
    expect(sql).toContain("jsonb_build_object('id', s.id, 'signer_address', s.signer_address)");
    expect(sql).not.toContain("s.witness");
    expect(sql).not.toContain("s.invocation_script");
    expect(sql).not.toContain("s.verification_script");
    expect(sql).not.toContain("s.public_key");
    expect(sql).not.toContain("'signature', s.signature");
    // No unprojected row dump on the default path.
    expect(sql).not.toContain("SELECT r.*");
    // Ordering preserved.
    expect(sql).toMatch(/ORDER BY r\.created_at DESC/);
  });

  it("defaults to limit 50 / offset 0", async () => {
    const res = mockRes();
    await handler(getReq(), res);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toMatch(/LIMIT \$\d+ OFFSET \$\d+/);
    expect(params).toEqual([50, 0]);
  });

  it("honors limit/offset/status and prepends the network filter", async () => {
    const res = mockRes();
    await handler(getReq({ network: "mainnet", status: "PENDING", limit: "10", offset: "20" }), res);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain("(r.network = $1 OR r.network_mode = $1)");
    expect(sql).toContain("r.status = $2");
    expect(params).toEqual(["mainnet", "PENDING", 10, 20]);
  });

  it("caps limit at 100, floors it at 1, and clamps offset to [0, 10000]", async () => {
    const res1 = mockRes();
    await handler(getReq({ limit: "9999", offset: "-5" }), res1);
    expect(queryMock.mock.calls[0][1]).toEqual([100, 0]);

    const res2 = mockRes();
    await handler(getReq({ limit: "0", offset: "99999999" }), res2);
    expect(queryMock.mock.calls[1][1]).toEqual([1, 10000]);

    // Non-numeric values fall back to the defaults.
    const res3 = mockRes();
    await handler(getReq({ limit: "abc", offset: "xyz" }), res3);
    expect(queryMock.mock.calls[2][1]).toEqual([50, 0]);
  });

  it("rejects a malformed status filter with 400 before querying", async () => {
    const res = mockRes();
    await handler(getReq({ status: "PENDING; DROP TABLE" }), res);

    expect(res.statusCode).toBe(400);
    expect(String(res.payload?.error)).toMatch(/status/i);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("keeps the CORS headers and method guard intact", async () => {
    const res = mockRes();
    await handler(getReq(), res);
    expect(res.headers["Access-Control-Allow-Origin"]).toBe("https://www.neo3scan.com");
    expect(res.headers["Vary"]).toBe("Origin");

    const optionsRes = mockRes();
    await handler({ method: "OPTIONS", headers: {}, query: {} }, optionsRes);
    expect(optionsRes.statusCode).toBe(204);

    const putRes = mockRes();
    await handler({ method: "PUT", headers: {}, query: {} }, putRes);
    expect(putRes.statusCode).toBe(405);
  });
});

describe("api/multisig/requests GET (?full=1 back-compat)", () => {
  let handler;

  const FULL_ROW = {
    id: 7,
    status: "PENDING",
    unsigned_tx: "ff".repeat(64),
    params: { unsigned_tx: "aa".repeat(64), signature_metadata: { Na: { witness: "bb" } } },
    signatures: JSON.stringify([
      {
        id: 10,
        request_id: 7,
        signer_address: "Na",
        signature: "ab".repeat(64),
        public_key: "02aa",
        witness: "cc".repeat(32),
        invocation_script: "dd",
        verification_script: "ee",
        metadata: null,
        created_at: "2026-07-01T00:00:00Z",
      },
    ]),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    queryMock.mockResolvedValue({ rows: [{ ...FULL_ROW }] });
    handler = await loadHandler();
  });

  afterEach(() => {
    handler?._internal?.resetDepsForTests();
  });

  it("returns today's full shape verbatim: all row columns and full signature payloads", async () => {
    const res = mockRes();
    await handler(getReq({ full: "1" }), res);

    expect(res.statusCode).toBe(200);
    const row = res.payload[0];
    expect(row.unsigned_tx).toBe(FULL_ROW.unsigned_tx);
    expect(row.params.unsigned_tx).toBe(FULL_ROW.params.unsigned_tx);
    expect(row.params.signature_metadata).toEqual(FULL_ROW.params.signature_metadata);
    // JSON-aggregated signatures are parsed, with every column intact.
    expect(row.signatures[0].witness).toBe("cc".repeat(32));
    expect(row.signatures[0].signature).toBe("ab".repeat(64));
    expect(row.signatures[0].invocation_script).toBe("dd");
    expect(row.signatures[0].verification_script).toBe("ee");
  });

  it("issues today's full query: r.* with every signature column, grouped and capped at 500", async () => {
    const res = mockRes();
    await handler(getReq({ full: "1", network: "mainnet" }), res);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain("SELECT r.*");
    expect(sql).toContain("'witness', s.witness");
    expect(sql).toContain("'invocation_script', s.invocation_script");
    expect(sql).toContain("'verification_script', s.verification_script");
    expect(sql).toContain("'signature', s.signature");
    expect(sql).toContain("'public_key', s.public_key");
    expect(sql).toContain("(r.network = $1 OR r.network_mode = $1)");
    expect(sql).toContain("GROUP BY r.id ORDER BY r.created_at DESC LIMIT 500");
    expect(params).toEqual(["mainnet"]);
  });

  it("ignores limit/offset/status on the full path (today's behavior preserved)", async () => {
    const res = mockRes();
    await handler(getReq({ full: "1", limit: "5", offset: "10", status: "PENDING" }), res);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain("LIMIT 500");
    expect(sql).not.toContain("OFFSET");
    expect(sql).not.toContain("r.status");
    expect(params).toEqual([]);
  });
});
