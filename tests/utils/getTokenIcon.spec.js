import { describe, expect, it } from "vitest";

import { KNOWN_CONTRACTS } from "@/constants/knownContracts";
import { getTokenIcon, hasTokenIcon } from "@/utils/getTokenIcon";

const FLAMINGO_APE_HASH = "0x63f1a9c6bef178f54a6332b874407068d9a99e50";
const FLAMINGO_APE_LOGO = "https://flamingo.finance/img/tokens/circle/APE.svg";
const BNEO_HASH = "0x48c40d4666f93408be1bef038b6722404d9a4c2a";
const NEOBURGER_LOGO = "https://app.neoburger.io/favicon.ico";
const NEOX_BRIDGE_HASH = "0xbb19cfc864b73159277e1fd39694b3fd5fc613d2";
const NEOX_LOGO = "https://x.neo.org/favicon.ico";

describe("getTokenIcon Flamingo fallback", () => {
  it("exposes Flamingo token metadata in known contracts", () => {
    expect(KNOWN_CONTRACTS[FLAMINGO_APE_HASH]).toMatchObject({
      name: "APE",
      symbol: "APE",
      decimals: 8,
      logo: FLAMINGO_APE_LOGO,
    });
  });

  it("returns Flamingo logo when local token icon is missing", () => {
    expect(getTokenIcon(FLAMINGO_APE_HASH, "NEP17")).toBe(FLAMINGO_APE_LOGO);
  });

  it("keeps explicit NeoBurger override for bNEO contract hash", () => {
    expect(KNOWN_CONTRACTS[BNEO_HASH]?.logo).toBe(NEOBURGER_LOGO);
  });

  it("maps NeoXBridge contract hash to NeoX logo", () => {
    expect(KNOWN_CONTRACTS[NEOX_BRIDGE_HASH]).toMatchObject({
      name: "NeoXBridge",
      logo: NEOX_LOGO,
    });
    expect(getTokenIcon(NEOX_BRIDGE_HASH, "NEP17")).toBe(NEOX_LOGO);
  });

  it("treats known Flamingo logos as available token icons", () => {
    expect(hasTokenIcon(FLAMINGO_APE_HASH)).toBe(true);
  });

  it("keeps default icon fallback for unknown token hash", () => {
    const unknownHash = "0x1111111111111111111111111111111111111111";
    expect(getTokenIcon(unknownHash, "NEP17")).toBe(getTokenIcon("", "NEP17"));
  });
});
