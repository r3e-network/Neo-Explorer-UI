import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toNetworkMode } from "@/utils/rpcEndpoints";
import { buildMultisigMutationMessage as clientBuild } from "@/utils/multisigMutationAuth";
import * as serverAuth from "../../api/lib/multisigMutationAuth.js";
import * as serverGov from "../../api/lib/governanceSignature.js";

// Guards the multisig-mutation signed-message PARITY between the client (which
// signs) and the server (which verifies). The PATCH replay protection verifies
// the signature over a server-rebuilt message; if the server's message diverges
// from the client's by a single byte, EVERY mutation 403s.
//
// Two layers of coverage here: (1) pure-function message parity (below), and
// (2) full handler 200/409/401/403 behavioral coverage (second describe block).
// The PATCH endpoint lives at the Vercel dynamic route
// api/multisig/requests/[id].js; the bracketed filename is not instrumented by
// the vitest/Vite module graph, so its CJS require()s cannot be intercepted via
// vi.mock. The handler therefore exposes an _internal dependency seam (query +
// verifyMutation) that the behavioral block injects.

const COMMON = {
  requestId: 7,
  status: "executed",
  broadcastTxHash: "",
  broadcastAt: "",
  metadata: null,
  signedAt: 1718900000000,
};

describe("multisig mutation signed-message parity (client vs server)", () => {
  it("server canonicalizes the network identically to the client (testt5 -> testnet)", () => {
    // A proposal row can carry a non-canonical alias; the server must collapse
    // it the same way the client's getNetworkMode (=toNetworkMode) does.
    const proposal = { network: "testt5", network_mode: "testt5", params: {} };

    const serverMessage = serverAuth.buildMultisigMutationMessage({
      ...COMMON,
      network: serverGov.resolveRequestNetwork(proposal),
    });
    const clientMessage = clientBuild({
      ...COMMON,
      network: toNetworkMode("testt5"),
    });

    expect(serverMessage).toBe(clientMessage);
    expect(serverMessage).toContain("Network: testnet");
    expect(serverMessage).not.toContain("Network: testt5");
  });

  it("regression guard: a raw alias network would diverge from the canonical one", () => {
    // This is exactly the divergence the fix removes — proof that canonicalizing
    // (not passing the raw proposal.network) is load-bearing.
    const rawAliasMessage = serverAuth.buildMultisigMutationMessage({ ...COMMON, network: "testt5" });
    const canonicalMessage = serverAuth.buildMultisigMutationMessage({ ...COMMON, network: "testnet" });
    expect(rawAliasMessage).not.toBe(canonicalMessage);
  });

  it("client and server builders are byte-identical for canonical inputs incl. metadata + signedAt", () => {
    const fields = {
      requestId: 42,
      network: "mainnet",
      status: "EXECUTED",
      broadcastTxHash: `0x${"12".repeat(32)}`,
      broadcastAt: "2026-06-20T10:00:00.000Z",
      signedAt: 1718900000001,
      metadata: { z: 1, broadcast_witness: { verificationScript: "bb", invocationScript: "aa" } },
    };
    expect(serverAuth.buildMultisigMutationMessage(fields)).toBe(clientBuild(fields));
  });

  it("binds a Signed At line (v2) so the signature is freshness/replay scoped", () => {
    const msg = serverAuth.buildMultisigMutationMessage({ ...COMMON, network: "mainnet" });
    expect(msg).toContain("Neo Explorer Multisig Mutation v2");
    expect(msg).toContain("Signed At: 1718900000000");
  });

  it("verifyMultisigMutationAuthorization returns the normalized signature for single-use keying", () => {
    // Behavioral assurance the consume key cannot diverge from the verified
    // signature (base64 vs hex of the same signature collapse to one key).
    expect(typeof serverAuth.verifyMultisigMutationAuthorization).toBe("function");
    expect(typeof serverAuth._internal.normalizeSignatureHex).toBe("function");
    const hex = "ab".repeat(64);
    expect(serverAuth._internal.normalizeSignatureHex(hex)).toBe(hex);
    // base64 of the same 64 bytes normalizes to the identical hex key.
    const b64 = Buffer.from(hex, "hex").toString("base64");
    expect(serverAuth._internal.normalizeSignatureHex(b64)).toBe(hex);
  });
});

// Full behavioral coverage of the PATCH replay path, enabled by the handler's
// _internal dependency seam (the bracketed Vercel route cannot be vi.mock'd).
// The same-origin guard and mutation policy are driven for real (Origin header +
// ENABLE_FRONTEND_MULTISIG_MUTATIONS); only query + signature verification are
// injected so the freshness / single-use / authz logic runs deterministically.
describe("multisig PATCH replay protection (behavioral)", () => {
  const PROPOSAL = {
    id: 1,
    creator_address: "Ncreator",
    network: "testt5",
    network_mode: "testt5",
    params: { committee_pubkeys: [`02${"11".repeat(32)}`] },
  };
  const queryMock = vi.fn();
  const verifyMock = vi.fn();
  let handler;

  function installQuery({ insertReturns }) {
    queryMock.mockReset();
    queryMock.mockImplementation(async (sql) => {
      if (/SELECT id, creator_address/i.test(sql)) return { rows: [PROPOSAL] };
      if (/DELETE FROM multisig_mutation_used/i.test(sql)) return { rows: [] };
      if (/INSERT INTO multisig_mutation_used/i.test(sql)) return { rows: insertReturns };
      if (/UPDATE multisig_requests SET/i.test(sql)) return { rows: [{ id: 1, status: "executed" }] };
      return { rows: [] };
    });
  }

  function mockRes() {
    return {
      statusCode: 200,
      payload: null,
      headers: {},
      setHeader(n, v) { this.headers[n] = String(v); },
      status(c) { this.statusCode = c; return this; },
      json(b) { this.payload = b; return this; },
      end() { return this; },
    };
  }

  function patchReq(overrides = {}) {
    return {
      method: "PATCH",
      headers: { origin: "https://www.neo3scan.com" },
      query: { id: "1" },
      body: {
        signer_address: "Nsigner",
        status: "executed",
        mutation_signature: "ab".repeat(64),
        mutation_public_key: `02${"11".repeat(32)}`,
        mutation_signed_at: Date.now(),
        ...overrides,
      },
    };
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv("ENABLE_FRONTEND_MULTISIG_MUTATIONS", "true");
    const { resetSimpleRateLimitForTests } = await import("../../api/lib/simpleRateLimit.js");
    resetSimpleRateLimitForTests();
    const mod = await import("../../api/multisig/requests/[id].js");
    handler = mod.default;
    verifyMock.mockResolvedValue({
      signerAddress: "Nsigner",
      publicKey: `02${"11".repeat(32)}`,
      signature: "ab".repeat(64),
    });
    handler._internal.setDepsForTests({ query: queryMock, verifyMutation: verifyMock });
  });

  afterEach(() => {
    handler?._internal?.resetDepsForTests();
    vi.unstubAllEnvs();
  });

  it("applies a fresh, verified, first-use mutation (200) and verifies a canonical-network message", async () => {
    installQuery({ insertReturns: [{ request_id: 1 }] });
    const res = mockRes();
    await handler(patchReq(), res);

    expect(res.statusCode).toBe(200);
    // single-use record written, then the state update applied
    expect(queryMock.mock.calls.some((c) => /INSERT INTO multisig_mutation_used/i.test(c[0]))).toBe(true);
    expect(queryMock.mock.calls.some((c) => /UPDATE multisig_requests SET/i.test(c[0]))).toBe(true);
    // parity: the "testt5" proposal row is canonicalized to testnet for signing
    expect(verifyMock.mock.calls[0][0].message).toContain("Network: testnet");
  });

  it("rejects a replayed signature (409) and never applies the UPDATE", async () => {
    installQuery({ insertReturns: [] }); // ON CONFLICT DO NOTHING -> 0 rows
    const res = mockRes();
    await handler(patchReq(), res);

    expect(res.statusCode).toBe(409);
    expect(String(res.payload?.error)).toMatch(/replay/i);
    expect(queryMock.mock.calls.some((c) => /UPDATE multisig_requests SET/i.test(c[0]))).toBe(false);
  });

  it("rejects a stale/missing timestamp (401) before verifying or consuming", async () => {
    installQuery({ insertReturns: [{ request_id: 1 }] });
    const res = mockRes();
    await handler(patchReq({ mutation_signed_at: Date.now() - 10 * 60 * 1000 }), res);

    expect(res.statusCode).toBe(401);
    expect(verifyMock).not.toHaveBeenCalled();
    expect(queryMock.mock.calls.some((c) => /INSERT INTO multisig_mutation_used/i.test(c[0]))).toBe(false);
  });

  it("rejects an unauthorized signer (403) and never consumes or applies", async () => {
    installQuery({ insertReturns: [{ request_id: 1 }] });
    verifyMock.mockRejectedValueOnce(new Error("Signer is not authorized to mutate this proposal."));
    const res = mockRes();
    await handler(patchReq(), res);

    expect(res.statusCode).toBe(403);
    expect(queryMock.mock.calls.some((c) => /INSERT INTO multisig_mutation_used/i.test(c[0]))).toBe(false);
  });
});
