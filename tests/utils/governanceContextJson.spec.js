import { beforeAll, describe, expect, it } from "vitest";
import { hexToBase64 } from "@/utils/neoHelpers";
import { decodeUnsignedTransaction, ensureNeonJs } from "@/utils/unsignedTransaction";

beforeAll(async () => { await ensureNeonJs(); });

/**
 * Validates the ContractParametersContext JSON format that neo-cli expects.
 * This is the same structure used in GovernanceAddWitnessModal and
 * GovernanceProposalDetail to generate the "neo-cli JSON" copy payload.
 *
 * neo-cli format:
 * {
 *   "type": "Neo.Network.P2P.Payloads.Transaction",
 *   "hash": "0x<txhash>",
 *   "data": "<base64-encoded-unsigned-tx>",
 *   "items": {
 *     "<scriptHash>": {
 *       "script": "<base64-verification-script>",
 *       "parameters": [{"type":"Signature"}, ...],
 *       "signatures": {}
 *     }
 *   },
 *   "network": <network-magic-number>
 * }
 */

// Minimal unsigned transaction hex (version=0, nonce, sysfee, netfee, validuntil, 1 signer, 0 attrs, script)
// This is a hand-crafted minimal unsigned Neo N3 tx for testing.
const SAMPLE_UNSIGNED_TX_HEX =
  "00" + // version
  "01000000" + // nonce
  "0000000000000000" + // systemFee (0)
  "0000000000000000" + // networkFee (0)
  "05000000" + // validUntilBlock (5)
  "01" + // signers count
  "0000000000000000000000000000000000000000" + // signer account (20 bytes)
  "01" + // WitnessScope = CalledByEntry
  "00" + // attributes count
  "01" + // script length (1 byte)
  "40"; // script: NOP opcode

const SAMPLE_COMMITTEE_PUBKEYS = [
  "02028a99826edc0c97d18e22b6932373d908d323aa7f92656a77ec26e8861699ef",
  "031d8e1630ce640966967bc6d95223d21f44304133003140c3b52004dc981349c9",
  "03b209fd4f53a7170ea4444e0cb0a6bb6a53c2bd016926989cf85f9b0fba17a70c",
];
const SAMPLE_THRESHOLD = 2;
const SAMPLE_SCRIPT_HASH = "cc5e4edd9f5f8dba8bb65734541df7a1c081c67b";
const SAMPLE_NETWORK_MAGIC = 860833102;

function buildContextJson({
  unsignedTxHex,
  threshold,
  scriptHash,
  networkMagic,
  verificationScript = "",
}) {
  const decoded = decodeUnsignedTransaction(unsignedTxHex);
  if (!decoded?.hash) return "";

  const base64Tx = hexToBase64(unsignedTxHex);
  const normalizedHash = String(scriptHash).replace(/^0x/i, "").toLowerCase();
  const parameters = Array.from({ length: threshold }, () => ({ type: "Signature" }));

  let base64VerificationScript = "";
  if (verificationScript) {
    base64VerificationScript = hexToBase64(verificationScript);
  }

  return JSON.stringify({
    type: "Neo.Network.P2P.Payloads.Transaction",
    hash: decoded.hash.startsWith("0x") ? decoded.hash : "0x" + decoded.hash,
    data: base64Tx,
    items: {
      [normalizedHash]: {
        script: base64VerificationScript,
        parameters,
        signatures: {},
      },
    },
    network: networkMagic,
  });
}

describe("ContractParametersContext JSON format for neo-cli", () => {
  it("produces valid JSON with all required top-level fields", () => {
    const json = buildContextJson({
      unsignedTxHex: SAMPLE_UNSIGNED_TX_HEX,
      committeePubkeys: SAMPLE_COMMITTEE_PUBKEYS,
      threshold: SAMPLE_THRESHOLD,
      scriptHash: SAMPLE_SCRIPT_HASH,
      networkMagic: SAMPLE_NETWORK_MAGIC,
    });

    expect(json).toBeTruthy();
    const parsed = JSON.parse(json);

    expect(parsed.type).toBe("Neo.Network.P2P.Payloads.Transaction");
    expect(parsed.hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(parsed.data).toBeTruthy();
    expect(typeof parsed.network).toBe("number");
    expect(parsed.network).toBe(SAMPLE_NETWORK_MAGIC);
    expect(parsed.items).toBeTruthy();
    expect(typeof parsed.items).toBe("object");
  });

  it("data field is valid base64 encoding of the unsigned transaction", () => {
    const json = buildContextJson({
      unsignedTxHex: SAMPLE_UNSIGNED_TX_HEX,
      committeePubkeys: SAMPLE_COMMITTEE_PUBKEYS,
      threshold: SAMPLE_THRESHOLD,
      scriptHash: SAMPLE_SCRIPT_HASH,
      networkMagic: SAMPLE_NETWORK_MAGIC,
    });

    const parsed = JSON.parse(json);
    // Verify data is valid base64
    const decoded = atob(parsed.data);
    expect(decoded.length).toBeGreaterThan(0);
    // Round-trip: base64 decode should produce bytes matching original hex length
    expect(decoded.length).toBe(SAMPLE_UNSIGNED_TX_HEX.length / 2);
  });

  it("items key matches the provided script hash (lowercase, no 0x prefix)", () => {
    const json = buildContextJson({
      unsignedTxHex: SAMPLE_UNSIGNED_TX_HEX,
      committeePubkeys: SAMPLE_COMMITTEE_PUBKEYS,
      threshold: SAMPLE_THRESHOLD,
      scriptHash: "0x" + SAMPLE_SCRIPT_HASH,
      networkMagic: SAMPLE_NETWORK_MAGIC,
    });

    const parsed = JSON.parse(json);
    const itemKeys = Object.keys(parsed.items);
    expect(itemKeys).toHaveLength(1);
    expect(itemKeys[0]).toBe(SAMPLE_SCRIPT_HASH.toLowerCase());
    expect(itemKeys[0]).not.toMatch(/^0x/);
  });

  it("parameters array length matches the threshold", () => {
    for (const threshold of [2, 11, 14]) {
      const json = buildContextJson({
        unsignedTxHex: SAMPLE_UNSIGNED_TX_HEX,
        committeePubkeys: SAMPLE_COMMITTEE_PUBKEYS,
        threshold,
        scriptHash: SAMPLE_SCRIPT_HASH,
        networkMagic: SAMPLE_NETWORK_MAGIC,
      });

      const parsed = JSON.parse(json);
      const item = Object.values(parsed.items)[0];
      expect(item.parameters).toHaveLength(threshold);
      item.parameters.forEach((p) => {
        expect(p.type).toBe("Signature");
      });
    }
  });

  it("signatures object starts empty", () => {
    const json = buildContextJson({
      unsignedTxHex: SAMPLE_UNSIGNED_TX_HEX,
      committeePubkeys: SAMPLE_COMMITTEE_PUBKEYS,
      threshold: SAMPLE_THRESHOLD,
      scriptHash: SAMPLE_SCRIPT_HASH,
      networkMagic: SAMPLE_NETWORK_MAGIC,
    });

    const parsed = JSON.parse(json);
    const item = Object.values(parsed.items)[0];
    expect(item.signatures).toEqual({});
  });

  it("hash field is deterministic for the same transaction", () => {
    const json1 = buildContextJson({
      unsignedTxHex: SAMPLE_UNSIGNED_TX_HEX,
      committeePubkeys: SAMPLE_COMMITTEE_PUBKEYS,
      threshold: SAMPLE_THRESHOLD,
      scriptHash: SAMPLE_SCRIPT_HASH,
      networkMagic: SAMPLE_NETWORK_MAGIC,
    });
    const json2 = buildContextJson({
      unsignedTxHex: SAMPLE_UNSIGNED_TX_HEX,
      committeePubkeys: SAMPLE_COMMITTEE_PUBKEYS,
      threshold: SAMPLE_THRESHOLD,
      scriptHash: SAMPLE_SCRIPT_HASH,
      networkMagic: SAMPLE_NETWORK_MAGIC,
    });

    const parsed1 = JSON.parse(json1);
    const parsed2 = JSON.parse(json2);
    expect(parsed1.hash).toBe(parsed2.hash);
  });

  it("includes verification script as base64 when provided", () => {
    const verificationScript = "0c2102028a99826edc0c97d18e22b6932373d908d323aa7f92656a77ec26e8861699ef";
    const json = buildContextJson({
      unsignedTxHex: SAMPLE_UNSIGNED_TX_HEX,
      committeePubkeys: SAMPLE_COMMITTEE_PUBKEYS,
      threshold: SAMPLE_THRESHOLD,
      scriptHash: SAMPLE_SCRIPT_HASH,
      networkMagic: SAMPLE_NETWORK_MAGIC,
      verificationScript,
    });

    const parsed = JSON.parse(json);
    const item = Object.values(parsed.items)[0];
    expect(item.script).toBeTruthy();
    // Should be valid base64
    const decoded = atob(item.script);
    expect(decoded.length).toBe(verificationScript.length / 2);
  });

  it("returns empty string for invalid transaction hex", () => {
    const json = buildContextJson({
      unsignedTxHex: "zzzz",
      committeePubkeys: SAMPLE_COMMITTEE_PUBKEYS,
      threshold: SAMPLE_THRESHOLD,
      scriptHash: SAMPLE_SCRIPT_HASH,
      networkMagic: SAMPLE_NETWORK_MAGIC,
    });
    expect(json).toBe("");
  });
});
