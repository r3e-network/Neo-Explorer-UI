import { describe, expect, it } from "vitest";
import {
  NEOX_GOV_REWARD_ADDRESS,
  analyzeNeoxAntiMevTransaction,
  getNeoxAntiMevProfile,
  getNeoxBlockProtection,
  parseNeoxEnvelopeData,
} from "@/utils/neoxAntiMev";

function envelopeData({ round = 17, gas = 500_000, hashByte = "42" } = {}) {
  const u32 = (value) => Number(value).toString(16).padStart(8, "0");
  return `0xffffffff${u32(round)}${u32(gas)}${hashByte.repeat(32)}${"00".repeat(192 + 112)}`;
}

describe("Neo X Anti-MEV Envelope parsing", () => {
  it("decodes the public Envelope metadata without decrypting ciphertext", () => {
    expect(parseNeoxEnvelopeData(envelopeData())).toMatchObject({
      isEnvelope: true,
      isStructurallyValid: true,
      dkgRound: 17,
      encryptedGas: 500_000,
      innerTransactionHash: `0x${"42".repeat(32)}`,
      totalBytes: 348,
      encryptedKeyBytes: 192,
      encryptedMessageBytes: 112,
      encryptedPayloadBytes: 304,
    });
  });

  it("rejects unrelated calldata and reports malformed reserved payloads", () => {
    expect(parseNeoxEnvelopeData("0x12345678")).toBeNull();
    expect(parseNeoxEnvelopeData("0xffffffff00000000")).toMatchObject({
      isEnvelope: true,
      isStructurallyValid: false,
    });
  });

  it("requires the GovReward target and an eligible EVM transaction type", () => {
    const transaction = {
      to: NEOX_GOV_REWARD_ADDRESS,
      txType: 2,
      blockIndex: 5_271_676,
      rawInput: envelopeData(),
    };

    expect(analyzeNeoxAntiMevTransaction(transaction)).toMatchObject({
      dkgRound: 17,
      canonicalRecord: true,
    });
    expect(analyzeNeoxAntiMevTransaction({ ...transaction, to: "0x0000000000000000000000000000000000000001" })).toBeNull();
    expect(analyzeNeoxAntiMevTransaction({ ...transaction, txType: 3 })).toBeNull();
  });

  it("tracks the documented activation heights independently per network", () => {
    expect(getNeoxAntiMevProfile("neox-mainnet").activationHeight).toBe(3_749_760);
    expect(getNeoxAntiMevProfile("neox-testnet").activationHeight).toBe(2_088_000);
    expect(getNeoxBlockProtection(3_749_759, "neox-mainnet").active).toBe(false);
    expect(getNeoxBlockProtection(3_749_760, "neox-mainnet")).toMatchObject({
      active: true,
      preBlockName: "PreBlock / Shadow Block",
      consensusPhase: "PreCommit",
    });
  });
});
