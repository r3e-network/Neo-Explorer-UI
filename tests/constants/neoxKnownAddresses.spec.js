import { describe, expect, it } from "vitest";
import {
  NEOX_KNOWN_ADDRESSES,
  NEOX_ROLE_META,
  resolveNeoxIdentity,
} from "@/constants/neoxKnownAddresses";

describe("neoxKnownAddresses registry", () => {
  it("resolves the TokenBridge system address case-insensitively on both networks", () => {
    const lowercased = "0x1212000000000000000000000000000000000004";
    for (const net of ["neox-mainnet", "neox-testnet", "mainnet", "testnet"]) {
      const identity = resolveNeoxIdentity(lowercased, net);
      expect(identity).toEqual({ label: "Neo X Bridge (TokenBridge)", role: "bridge" });
    }
    // Mixed/upper-case query still hits.
    expect(resolveNeoxIdentity("0X1212000000000000000000000000000000000004".toLowerCase(), "neox-mainnet")).not.toBeNull();
    expect(resolveNeoxIdentity("0x1212000000000000000000000000000000000004", "NEOX-MAINNET")).toEqual({
      label: "Neo X Bridge (TokenBridge)",
      role: "bridge",
    });
  });

  it("scopes network-specific token entries to their own network", () => {
    const mainnetWgas = "0xdE41591ED1f8ED1484aC2CD8ca0876428de60EfF";
    const testnetWgas = "0x1CE16390FD09040486221e912B87551E4e44Ab17";

    expect(resolveNeoxIdentity(mainnetWgas, "neox-mainnet")).toEqual({
      label: "Wrapped GAS (WGAS10)",
      role: "token",
    });
    expect(resolveNeoxIdentity(mainnetWgas, "neox-testnet")).toBeNull();

    expect(resolveNeoxIdentity(testnetWgas, "neox-testnet")).toEqual({
      label: "Wrapped GAS (WGAS10)",
      role: "token",
    });
    expect(resolveNeoxIdentity(testnetWgas, "neox-mainnet")).toBeNull();
  });

  it("returns null for unknown addresses and empty input", () => {
    expect(resolveNeoxIdentity("0x000000000000000000000000000000000000dead", "neox-mainnet")).toBeNull();
    expect(resolveNeoxIdentity("", "neox-mainnet")).toBeNull();
    expect(resolveNeoxIdentity(null, "neox-testnet")).toBeNull();
  });

  it("resolves stand-by validators only on their own network", () => {
    const mainnetValidator = "0x34a3b2aBB99B4C128acf61dCBBd1FcAC0B161652";
    const testnetValidator = "0xcBBECa26e89011E32BA25610520B20741b809007";

    expect(resolveNeoxIdentity(mainnetValidator.toLowerCase(), "neox-mainnet")).toEqual({
      label: "Stand-by Validator 1",
      role: "validator",
    });
    expect(resolveNeoxIdentity(mainnetValidator, "neox-testnet")).toBeNull();

    expect(resolveNeoxIdentity(testnetValidator.toLowerCase(), "neox-testnet")).toEqual({
      label: "Stand-by Validator 1",
      role: "validator",
    });
    expect(resolveNeoxIdentity(testnetValidator, "neox-mainnet")).toBeNull();
  });

  it("resolves official Supra oracle deployments per network", () => {
    expect(resolveNeoxIdentity("0x8B506d2616671b6742b968C18bEFdA1e665A9025", "neox-mainnet")).toEqual({
      label: "Supra Pull Oracle",
      role: "oracle",
    });
    expect(resolveNeoxIdentity("0x8B506d2616671b6742b968C18bEFdA1e665A9025", "neox-testnet")).toBeNull();
    expect(resolveNeoxIdentity("0xE7d292a336c15ab80A51E9b6959b5Ec9eA870474", "neox-testnet")).toEqual({
      label: "Supra GAS/USDT Feed",
      role: "oracle",
    });
  });

  it("does not misclassify the fixed Governance Reward coinbase as a validator", () => {
    expect(resolveNeoxIdentity("0x1212000000000000000000000000000000000003", "neox-mainnet")).toEqual({
      label: "Governance Reward",
      role: "governance",
    });
  });

  it("only uses roles that exist in NEOX_ROLE_META", () => {
    for (const entry of NEOX_KNOWN_ADDRESSES) {
      expect(NEOX_ROLE_META[entry.role], `role "${entry.role}" for ${entry.address}`).toBeDefined();
      expect(["both", "mainnet", "testnet"]).toContain(entry.network);
      expect(entry.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    }
  });
});
