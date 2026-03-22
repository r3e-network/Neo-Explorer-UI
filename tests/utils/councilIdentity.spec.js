import { buildCouncilIdentityMap, resolveCouncilIdentity } from "@/utils/councilIdentity";
import { vi } from "vitest";

vi.mock("@/constants/knownAddresses", () => ({
  getKnownAddressName: vi.fn(() => ""),
  getKnownAddressLogo: vi.fn(() => ""),
}));

vi.mock("@/utils/neoHelpers", () => ({
  addressToScriptHash: vi.fn((addr) => `hash_of_${addr}`),
  publicKeyToAddress: vi.fn((pk) => `addr_of_${pk}`),
  scriptHashToAddress: vi.fn((h) => `addr_from_${h}`),
}));

describe("buildCouncilIdentityMap", () => {
  it("returns an empty map for no rows", () => {
    const map = buildCouncilIdentityMap([]);
    expect(map.size).toBe(0);
  });

  it("returns an empty map for non-array input", () => {
    expect(buildCouncilIdentityMap(null).size).toBe(0);
    expect(buildCouncilIdentityMap(undefined).size).toBe(0);
    expect(buildCouncilIdentityMap("not-array").size).toBe(0);
  });

  it("registers identity by address, derived script hash, and derived address", () => {
    const rows = [{ address: "NAddr1", display_name: "Alice", logo_url: "alice.png" }];
    const map = buildCouncilIdentityMap(rows);

    // Should have entries for: NAddr1, hash_of_NAddr1, addr_from_NAddr1 (all lowercased)
    expect(map.get("naddr1")).toEqual({ name: "Alice", logo: "alice.png" });
    expect(map.get("hash_of_naddr1")).toEqual({ name: "Alice", logo: "alice.png" });
    expect(map.get("addr_from_naddr1")).toEqual({ name: "Alice", logo: "alice.png" });
  });

  it("registers identity by public key derivation", () => {
    const rows = [{ public_key: "pk123", name: "Bob", logo: "bob.png" }];
    const map = buildCouncilIdentityMap(rows);

    expect(map.get("addr_of_pk123")).toEqual({ name: "Bob", logo: "bob.png" });
    expect(map.get("hash_of_addr_of_pk123")).toEqual({ name: "Bob", logo: "bob.png" });
  });

  it("skips rows with empty address and no public key", () => {
    const rows = [{ display_name: "Ghost" }];
    const map = buildCouncilIdentityMap(rows);
    expect(map.size).toBe(0);
  });
});

describe("resolveCouncilIdentity", () => {
  it("returns address, name, and logo from identity map", () => {
    const identityMap = new Map([["alice", { name: "Alice", logo: "alice.png" }]]);
    const result = resolveCouncilIdentity("Alice", identityMap);
    expect(result).toEqual({ address: "Alice", name: "Alice", logo: "alice.png" });
  });

  it("falls back to address string when not in map", () => {
    const result = resolveCouncilIdentity("NUnknown", new Map());
    expect(result.address).toBe("NUnknown");
    expect(result.name).toBe("NUnknown");
    expect(result.logo).toBe("");
  });

  it("handles null/undefined address", () => {
    const result = resolveCouncilIdentity(null);
    expect(result.address).toBe("");
    expect(result.name).toBe("");
  });
});
