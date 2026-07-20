import { afterEach, describe, expect, it, vi } from "vitest";

const { ethCallMock } = vi.hoisted(() => ({ ethCallMock: vi.fn() }));

vi.mock("@/services/neox/rpcService", () => ({
  rpcService: { ethCall: ethCallMock },
}));

import {
  clearConsensusCache,
  decodeAddressArrayResult,
  enrichBlocksWithConsensus,
  getConsensusValidators,
} from "@/services/neox/consensusService";

const VALIDATORS = [
  "0x7de5b7c69b344bb4e75a39442594753ab1c67078",
  "0x05f1167317c9274fec85d557c0adb57f318a3a54",
  "0x379ddafffaa57d87e4ccfb8c72015c1dd105a30e",
  "0x84a32405966791d077811d4e9f21b43b1e7dd911",
  "0xaea4d663a7a67849056c72e5f1612f67c5f3bc55",
  "0xd7831da24b63a0b16423fb178e6fb6799b82d2b0",
  "0x77c6a598e577a507288b14d6aa976776f519b974",
];

const word = (value) => BigInt(value).toString(16).padStart(64, "0");
const encodeAddressArray = (addresses) =>
  `0x${word(32)}${word(addresses.length)}${addresses.map((address) => address.slice(2).padStart(64, "0")).join("")}`;

afterEach(() => {
  clearConsensusCache();
  vi.clearAllMocks();
});

describe("Neo X consensus primary resolution", () => {
  it("decodes the governance address array without reordering it", () => {
    expect(decodeAddressArrayResult(encodeAddressArray(VALIDATORS))).toEqual(VALIDATORS);
  });

  it("rejects malformed and unbounded governance responses", () => {
    expect(() => decodeAddressArrayResult("0x1234")).toThrow("Malformed consensus response");
    expect(() => decodeAddressArrayResult(`0x${word(32)}${word(101)}${"0".repeat(101 * 64)}`)).toThrow(
      "Invalid consensus validator count",
    );
  });

  it("calls Governance at the requested historical height", async () => {
    ethCallMock.mockResolvedValueOnce(encodeAddressArray(VALIDATORS));

    await expect(getConsensusValidators(9_117_188, { net: "neox-testnet" })).resolves.toEqual(VALIDATORS);
    expect(ethCallMock).toHaveBeenCalledWith(
      { to: "0x1212000000000000000000000000000000000001", data: "0x9f9d7f81" },
      expect.objectContaining({ net: "neox-testnet", blockTag: "0x8b1e04" }),
    );
  });

  it("resolves all blocks in an epoch with one cached RPC call", async () => {
    ethCallMock.mockResolvedValue(encodeAddressArray(VALIDATORS));

    const enriched = await enrichBlocksWithConsensus(
      [
        { index: 9_117_188, primaryIndex: 3 },
        { index: 9_117_187, primaryIndex: 2 },
      ],
      { net: "neox-testnet" },
    );

    expect(ethCallMock).toHaveBeenCalledTimes(1);
    expect(enriched[0]).toMatchObject({
      primaryValidator: VALIDATORS[3],
      primaryPosition: 4,
      consensusSize: 7,
      consensusResolved: true,
    });
    expect(enriched[1].primaryValidator).toBe(VALIDATORS[2]);
  });

  it("keeps block data usable when the governance RPC is unavailable", async () => {
    ethCallMock.mockRejectedValueOnce(new Error("upstream unavailable"));
    const [block] = await enrichBlocksWithConsensus([{ index: 9_117_188, primaryIndex: 3 }], {
      net: "neox-testnet",
    });

    expect(block).toMatchObject({
      index: 9_117_188,
      primaryPosition: 4,
      primaryValidator: null,
      consensusResolved: false,
    });
  });
});
