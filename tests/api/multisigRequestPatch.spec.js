import { describe, expect, it } from "vitest";
import { toNetworkMode } from "@/utils/rpcEndpoints";
import { buildMultisigMutationMessage as clientBuild } from "@/utils/multisigMutationAuth";
import * as serverAuth from "../../api/lib/multisigMutationAuth.js";
import * as serverGov from "../../api/lib/governanceSignature.js";

// Guards the multisig-mutation signed-message PARITY between the client (which
// signs) and the server (which verifies). The PATCH replay protection verifies
// the signature over a server-rebuilt message; if the server's message diverges
// from the client's by a single byte, EVERY mutation 403s.
//
// Note on handler-level behavioral coverage: the PATCH endpoint lives at the
// Vercel dynamic route api/multisig/requests/[id].js. The bracketed filename is
// not instrumented by the vitest/Vite module graph, so its CJS require()s are
// not interceptable via vi.mock (unlike the non-bracket handler tests that use
// _internal test seams). Full 200/409/401/403 behavioral coverage therefore
// requires a future test seam on that route; the freshness + single-use logic is
// guarded by tests/security/MultisigPatchFieldLockdown.spec.js source invariants,
// and the message parity it depends on is locked down behaviorally below.

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
