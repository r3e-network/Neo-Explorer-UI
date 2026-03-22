import { describe, expect, it } from "vitest";
import { getRequestNetwork, isGovernanceRequest, matchesRequestNetwork } from "../../src/utils/governanceRequests.js";

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
