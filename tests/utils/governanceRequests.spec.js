import { describe, expect, it } from "vitest";
import {
  getRequestNetwork,
  getRequiredSignatureCount,
  getStoredSignatureCount,
  isGovernanceRequest,
  isOffchainReviewPacket,
  matchesRequestNetwork,
  resolveCommitteePubkeys,
} from "../../src/utils/governanceRequests.js";

describe("isGovernanceRequest", () => {
  it("matches requests marked as governance by type", () => {
    expect(isGovernanceRequest({ type: "governance" }, { NEO: "ef4073" })).toBe(true);
  });

  it("matches native contract hashes even when prefixed with 0x or mixed case", () => {
    expect(
      isGovernanceRequest(
        { target_contract: "0xCC5E4EDD9F5F8DBA8BB65734541DF7A1C081C67B" },
        { PolicyContract: "cc5e4edd9f5f8dba8bb65734541df7a1c081c67b" }
      )
    ).toBe(true);
  });

  it("matches native contract hashes when native contracts are provided as hash-keyed metadata", () => {
    expect(
      isGovernanceRequest(
        { target_contract: "0xCC5E4EDD9F5F8DBA8BB65734541DF7A1C081C67B" },
        { "0xcc5e4edd9f5f8dba8bb65734541df7a1c081c67b": { name: "PolicyContract" } }
      )
    ).toBe(true);
  });

  it("matches legacy chained governance payloads returned from multisig_requests", () => {
    expect(
      isGovernanceRequest(
        {
          method: "setMillisecondsPerBlock, setGasPerBlock",
          params: [
            {
              method: "setMillisecondsPerBlock",
              contract: "0xcc5e4edd9f5f8dba8bb65734541df7a1c081c67b",
              args: [{ type: "Integer", value: "3000" }],
            },
            {
              method: "setGasPerBlock",
              contract: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
              args: [{ type: "Integer", value: "100000000" }],
            },
          ],
          metadata: {
            target_contracts: [
              { hash: "0xcc5e4edd9f5f8dba8bb65734541df7a1c081c67b", name: "PolicyContract" },
              { hash: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5", name: "NEO" },
            ],
          },
        },
        {
          PolicyContract: "cc5e4edd9f5f8dba8bb65734541df7a1c081c67b",
          NEO: "ef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
        }
      )
    ).toBe(true);
  });

  it("rejects unrelated requests", () => {
    expect(
      isGovernanceRequest(
        { target_contract: "0x1234", type: "multisig" },
        { PolicyContract: "cc5e4edd9f5f8dba8bb65734541df7a1c081c67b" }
      )
    ).toBe(false);
  });
});

describe("request network helpers", () => {
  it("normalizes explicit request network aliases", () => {
    expect(getRequestNetwork({ network: "TestT5" })).toBe("testnet");
    expect(getRequestNetwork({ network_mode: "MainNet" })).toBe("mainnet");
  });

  it("falls back to mainnet when request network is missing", () => {
    expect(getRequestNetwork({ description: "legacy" })).toBe("mainnet");
  });

  it("matches requests against the active explorer network", () => {
    expect(matchesRequestNetwork({ network: "testnet" }, "TestT5")).toBe(true);
    expect(matchesRequestNetwork({ network: "mainnet" }, "TestT5")).toBe(false);
  });
});

describe("governance request helpers", () => {
  it("detects off-chain review packets from metadata flags", () => {
    expect(isOffchainReviewPacket({ metadata: { offchain_packet_only: true } })).toBe(true);
    expect(isOffchainReviewPacket({ metadata: { offchain_packet_only: false } })).toBe(false);
  });

  it("falls back to metadata signature counts when embedded rows are absent", () => {
    expect(getStoredSignatureCount({ signatures: [], metadata: { signatures_collected: 11 } })).toBe(11);
    expect(getRequiredSignatureCount({ signers_required: 0, metadata: { signatures_needed: 11 } })).toBe(11);
  });

  it("prefers live committee ordering for official governance requests", () => {
    expect(
      resolveCommitteePubkeys(
        {
          params: {
            governance_mode: "official",
            committee_pubkeys: ["OLD1", "OLD2"],
          },
        },
        ["PK3", "PK1", "PK2"],
      ),
    ).toEqual(["PK3", "PK1", "PK2"]);
  });

  it("uses stored pubkeys for non-official multisig packets", () => {
    expect(resolveCommitteePubkeys({ params: { pubkeys: ["PK2", "PK1"] } }, ["LIVE1", "LIVE2"])).toEqual([
      "PK2",
      "PK1",
    ]);
  });
});
