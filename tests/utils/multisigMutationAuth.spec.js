import { describe, expect, it } from "vitest";
import { buildMultisigMutationMessage } from "@/utils/multisigMutationAuth";

describe("multisig mutation auth message", () => {
  it("canonicalizes mutation fields, metadata, and the signed-at timestamp for signing", () => {
    expect(
      buildMultisigMutationMessage({
        requestId: 7,
        network: "TestNet",
        status: "EXECUTED",
        broadcastTxHash: `0x${"12".repeat(32)}`,
        broadcastAt: "2026-06-20T10:00:00.000Z",
        signedAt: 1718900000000,
        metadata: {
          z: 1,
          broadcast_witness: {
            verificationScript: "bb",
            invocationScript: "aa",
          },
        },
      }),
    ).toBe(
      [
        "Neo Explorer Multisig Mutation v2",
        "Request ID: 7",
        "Network: testnet",
        "Status: EXECUTED",
        `Broadcast TX: 0x${"12".repeat(32)}`,
        "Broadcast At: 2026-06-20T10:00:00.000Z",
        'Metadata: {"broadcast_witness":{"invocationScript":"aa","verificationScript":"bb"},"z":1}',
        "Signed At: 1718900000000",
      ].join("\n"),
    );
  });

  it("defaults a missing signedAt to 0 so the line is always present", () => {
    expect(buildMultisigMutationMessage({ requestId: 1 })).toContain("Signed At: 0");
  });
});
