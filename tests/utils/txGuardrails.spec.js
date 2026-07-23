import { describe, expect, it } from "vitest";
import {
  analyzeProposal,
  decodeApprove,
  isUnlimitedApproval,
  parseHexWei,
} from "../../src/utils/txGuardrails.js";

// Labeled Neo X mainnet addresses (from the identity registry).
const WGAS10 = "0xdE41591ED1f8ED1484aC2CD8ca0876428de60EfF"; // token
const BRIDGE = "0x1212000000000000000000000000000000000004"; // Neo X Bridge

// Deliberately not in any registry.
const UNKNOWN_TO = "0x00000000000000000000000000000000deadbeef";
const UNKNOWN_SPENDER = "0x00000000000000000000000000000000cafebabe";

const NET = { net: "neox-mainnet" };
const MAX_WORD = "f".repeat(64);
const SMALL_WORD = "0".repeat(63) + "1";

function word(address) {
  return address.replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}
function approveCalldata(spender, amountWord) {
  return `0x095ea7b3${word(spender)}${amountWord}`;
}
function hexValue(gas) {
  return `0x${(BigInt(gas) * 10n ** 18n).toString(16)}`;
}
function codes(flags) {
  return flags.map((f) => f.code);
}

describe("parseHexWei", () => {
  it("parses hex, decimal, bare-hex and bigint; junk → 0n", () => {
    expect(parseHexWei("0x0de0b6b3a7640000")).toBe(10n ** 18n);
    expect(parseHexWei("1000000000000000000")).toBe(10n ** 18n);
    expect(parseHexWei(5n)).toBe(5n);
    expect(parseHexWei("0x")).toBe(0n);
    expect(parseHexWei("")).toBe(0n);
    expect(parseHexWei("not-a-number")).toBe(0n);
  });
});

describe("decodeApprove / isUnlimitedApproval", () => {
  it("decodes an approve and detects the max-uint amount", () => {
    const data = approveCalldata(UNKNOWN_SPENDER, MAX_WORD);
    const decoded = decodeApprove(data);
    expect(decoded.spender).toBe(UNKNOWN_SPENDER);
    expect(decoded.amount).toBe((1n << 256n) - 1n);
    expect(isUnlimitedApproval(data)).toBe(true);
  });

  it("returns null for non-approve calldata and false for a bounded approve", () => {
    expect(decodeApprove("0xabcdef01" + "0".repeat(64))).toBeNull();
    expect(isUnlimitedApproval(approveCalldata(UNKNOWN_SPENDER, SMALL_WORD))).toBe(false);
  });
});

describe("analyzeProposal — Neo X rules", () => {
  it("large_transfer fires at >= 100 GAS and not below", () => {
    const base = { chain: "neox", kind: "eth_tx" };
    const fired = analyzeProposal(
      { ...base, tx: { to: WGAS10, value: hexValue(100), data: "0x" } },
      NET,
    );
    expect(codes(fired)).toContain("large_transfer");

    const benign = analyzeProposal(
      { ...base, tx: { to: WGAS10, value: hexValue(1), data: "0x" } },
      NET,
    );
    expect(codes(benign)).not.toContain("large_transfer");
    expect(benign).toEqual([]);
  });

  it("unlimited_approval fires (danger) for max-uint approve, not for a bounded one", () => {
    const base = { chain: "neox", kind: "eth_tx" };
    const fired = analyzeProposal(
      { ...base, tx: { to: WGAS10, value: "0x0", data: approveCalldata(BRIDGE, MAX_WORD) } },
      NET,
    );
    expect(fired).toEqual([
      { level: "danger", code: "unlimited_approval", message: expect.any(String) },
    ]);

    const benign = analyzeProposal(
      { ...base, tx: { to: WGAS10, value: "0x0", data: approveCalldata(BRIDGE, SMALL_WORD) } },
      NET,
    );
    expect(codes(benign)).not.toContain("unlimited_approval");
    expect(benign).toEqual([]);
  });

  it("unlabeled_recipient fires for an unknown plain-transfer target, not a labeled one", () => {
    const base = { chain: "neox", kind: "eth_tx" };
    const fired = analyzeProposal(
      { ...base, tx: { to: UNKNOWN_TO, value: "0x1", data: "0x" } },
      NET,
    );
    expect(codes(fired)).toEqual(["unlabeled_recipient"]);

    const benign = analyzeProposal(
      { ...base, tx: { to: WGAS10, value: "0x1", data: "0x" } },
      NET,
    );
    expect(benign).toEqual([]);
  });

  it("unlabeled_contract fires for calldata to an unknown contract, not a labeled one", () => {
    const base = { chain: "neox", kind: "eth_tx" };
    const fired = analyzeProposal(
      { ...base, tx: { to: UNKNOWN_TO, value: "0x0", data: "0xabcdef01" + "0".repeat(64) } },
      NET,
    );
    expect(codes(fired)).toContain("unlabeled_contract");

    const benign = analyzeProposal(
      { ...base, tx: { to: WGAS10, value: "0x0", data: "0xabcdef01" + "0".repeat(64) } },
      NET,
    );
    expect(codes(benign)).not.toContain("unlabeled_contract");
  });

  it("orders flags deterministically: danger → warn → info (stable within a level)", () => {
    const proposal = {
      chain: "neox",
      kind: "eth_tx",
      tx: {
        to: UNKNOWN_TO,
        value: hexValue(200),
        data: approveCalldata(UNKNOWN_SPENDER, MAX_WORD),
      },
    };
    const flags = analyzeProposal(proposal, NET);
    expect(flags.map((f) => f.level)).toEqual(["danger", "warn", "info", "info"]);
    expect(codes(flags)).toEqual([
      "unlimited_approval",
      "large_transfer",
      "unlabeled_recipient",
      "unlabeled_contract",
    ]);
  });
});

describe("analyzeProposal — N3 rules", () => {
  const invoke = (toValue) => ({
    proposal: true,
    chain: "n3",
    kind: "invoke",
    operation: "transfer",
    from: "NfM3NJFuDtBwZchLh6DYpk1yPigRNmjcTQ",
    args: [
      { type: "Hash160", value: "NfM3NJFuDtBwZchLh6DYpk1yPigRNmjcTQ" },
      { type: "Hash160", value: toValue },
      { type: "Integer", value: "1" },
      { type: "Any", value: null },
    ],
  });

  it("unlabeled_recipient fires for an unknown N3 destination", () => {
    const fired = analyzeProposal(invoke("NUuqp8sJfCr9AGpvBBQ9zjuS9YZjnbDZ2M"));
    expect(codes(fired)).toEqual(["unlabeled_recipient"]);
  });

  it("does not fire for a labeled N3 destination", () => {
    // NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w is labeled "COZ".
    const benign = analyzeProposal(invoke("NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w"));
    expect(benign).toEqual([]);
  });
});

describe("analyzeProposal — guards", () => {
  it("returns [] for null / unrecognized proposals", () => {
    expect(analyzeProposal(null)).toEqual([]);
    expect(analyzeProposal({ chain: "solana" })).toEqual([]);
  });
});
