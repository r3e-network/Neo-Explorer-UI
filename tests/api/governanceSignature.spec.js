import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyMock = vi.hoisted(() => vi.fn());

vi.mock("@cityofzion/neon-js", () => { const _nm = {
  rpc: {
    RPCClient: class MockRpcClient {
      async getVersion() {
        return { protocol: { network: 860833102 } };
      }
    },
  },
  tx: {
    Transaction: {
      deserialize: vi.fn(() => ({
        hash: () => "abcd",
      })),
    },
  },
  u: {
    num2hexstring: vi.fn(() => "3353ef4e"),
    reverseHex: vi.fn((value) => value),
  },
  wallet: {
    verify: (...args) => verifyMock(...args),
    Account: class MockAccount {
      constructor(publicKey) {
        this.publicKey = String(publicKey || "").replace(/^0x/i, "").toLowerCase();
        this.address = this.publicKey === "03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5"
          ? "NSmKqfS6nR5dA8gVn4hU2pLw9bY7xT3cQe"
          : "NUnknownSigner";
        this.contract = {
          script: `0c21${this.publicKey}4156e7b327`,
        };
      }
    },
  },
}));

describe("governance signature verification", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("normalizes and verifies a valid committee witness", async () => {
    verifyMock.mockReturnValue(true);

    const { verifyGovernanceWitness } = await import("../../api/lib/governanceSignature.js");
    const result = await verifyGovernanceWitness({
      requestRow: {
        network: "mainnet",
        params: {
          unsigned_tx: "001122",
          committee_pubkeys: ["03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5"],
        },
      },
      signerAddress: "NSmKqfS6nR5dA8gVn4hU2pLw9bY7xT3cQe",
      publicKey: "03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5",
      signature: "ab".repeat(64),
    });

    expect(verifyMock).toHaveBeenCalledWith(
      "3353ef4eabcd",
      "ab".repeat(64),
      "03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5",
    );
    expect(result).toEqual({
      signerAddress: "NSmKqfS6nR5dA8gVn4hU2pLw9bY7xT3cQe",
      publicKey: "03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5",
      signature: "ab".repeat(64),
      invocationScript: `0c40${"ab".repeat(64)}`,
      verificationScript: "0c2103f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c54156e7b327",
    });
  });

  it("rejects signatures that do not match the governance payload", async () => {
    verifyMock.mockReturnValue(false);

    const { verifyGovernanceWitness } = await import("../../api/lib/governanceSignature.js");

    await expect(
      verifyGovernanceWitness({
        requestRow: {
          network: "mainnet",
          params: {
            unsigned_tx: "001122",
            committee_pubkeys: ["03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5"],
          },
        },
        signerAddress: "NSmKqfS6nR5dA8gVn4hU2pLw9bY7xT3cQe",
        publicKey: "03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5",
        signature: "cd".repeat(64),
      }),
    ).rejects.toThrow("Signature does not match the governance signing payload for this signer.");
  });
});
