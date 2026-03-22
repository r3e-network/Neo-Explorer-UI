import { describe, expect, it } from "vitest";
import { NET_ENV } from "../../src/utils/env.js";
import { getDoraCommitteeCacheKey, getDoraCommitteeUrl } from "../../src/utils/dora.js";

describe("dora committee helpers", () => {
  it("builds the v2 mainnet committee URL", () => {
    expect(getDoraCommitteeUrl(NET_ENV.Mainnet)).toBe("https://dora.coz.io/api/v2/neo3/mainnet/committee");
  });

  it("builds the v2 testnet committee URL", () => {
    expect(getDoraCommitteeUrl(NET_ENV.TestT5)).toBe("https://dora.coz.io/api/v2/neo3/testnet/committee");
  });

  it("uses network-specific cache keys", () => {
    expect(getDoraCommitteeCacheKey(NET_ENV.Mainnet)).toBe("dora_metadata_mainnet");
    expect(getDoraCommitteeCacheKey(NET_ENV.TestT5)).toBe("dora_metadata_testnet");
  });
});
