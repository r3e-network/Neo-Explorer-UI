import { describe, expect, it } from "vitest";
import {
  DEFAULT_GOVERNANCE_VALIDITY_DAYS,
  describeGovernanceTxExpiry,
  resolveGovernanceValidUntilBlock,
} from "@/utils/governanceTiming";

describe("governanceTiming", () => {
  it("targets a 30 day review window when protocol timing allows it", () => {
    expect(
      resolveGovernanceValidUntilBlock({
        currentHeight: 123,
        msPerBlock: 15000,
        maxValidUntilBlockIncrement: 999999,
      }),
    ).toBe(172923);
    expect(DEFAULT_GOVERNANCE_VALIDITY_DAYS).toBe(30);
  });

  it("caps the valid-until block at the protocol maximum increment", () => {
    expect(
      resolveGovernanceValidUntilBlock({
        currentHeight: 123,
        msPerBlock: 15000,
        maxValidUntilBlockIncrement: 5760,
      }),
    ).toBe(5883);
  });

  it("describes the remaining transaction lifetime from the current block height", () => {
    expect(
      describeGovernanceTxExpiry({
        validUntilBlock: 9055023,
        currentBlockHeight: 9050003,
        msPerBlock: 15000,
      }),
    ).toBe("Expires in 20h 55m");
  });

  it("describes expired governance transactions", () => {
    expect(
      describeGovernanceTxExpiry({
        validUntilBlock: 100,
        currentBlockHeight: 104,
        msPerBlock: 15000,
      }),
    ).toBe("Expired 1m ago");
  });
});
