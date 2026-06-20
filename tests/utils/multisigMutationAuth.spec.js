import { describe, expect, it } from "vitest";
import { buildMultisigMutationMessage } from "@/utils/multisigMutationAuth";

describe("multisig mutation auth message", () => {
  it("canonicalizes mutation fields and metadata for signing", () => {
    expect(
      buildMultisigMutationMessage({
        requestId: 7,
        network: "TestNet",
        status: "EXECUTED",
        broadcastTxHash: `0x${"12".repeat(32)}`,
        broadcastAt: "2026-06-20T10:00:00.000Z",
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
        "Neo Explorer Multisig Mutation v1",
        "Request ID: 7",
        "Network: testnet",
        "Status: EXECUTED",
        `Broadcast TX: 0x${"12".repeat(32)}`,
        "Broadcast At: 2026-06-20T10:00:00.000Z",
        'Metadata: {"broadcast_witness":{"invocationScript":"aa","verificationScript":"bb"},"z":1}',
      ].join("\n"),
    );
  });
});
