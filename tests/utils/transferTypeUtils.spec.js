import { describe, it, expect, vi } from "vitest";
import { isNullTx, getTypeLabel, getTypeBadge } from "@/utils/transferTypeUtils";

vi.mock("@/utils/isOracleReward", () => ({ default: () => false }));
vi.mock("@/utils/env", () => ({
  getCurrentEnv: () => "mainnet",
  NET_ENV: { Mainnet: "mainnet", TestT5: "testnet_t5" },
}));

describe("transferTypeUtils", () => {
  describe("isNullTx", () => {
    it("returns true for null tx hash", () => {
      expect(isNullTx("0x0000000000000000000000000000000000000000000000000000000000000000")).toBe(true);
    });

    it("returns false for real tx hash", () => {
      expect(isNullTx("0xabc123")).toBe(false);
    });
  });

  describe("getTypeLabel", () => {
    it("returns Block Reward for 50000000 system mint", () => {
      expect(
        getTypeLabel(
          { txid: "0x0000000000000000000000000000000000000000000000000000000000000000", from: null, value: "50000000" },
          "nep17",
        ),
      ).toBe("Block Reward");
    });

    it("returns Mint for null from", () => {
      expect(getTypeLabel({ from: null, txid: "0xabc" }, "nep11")).toBe("Mint");
    });

    it("returns Burn for null to", () => {
      expect(getTypeLabel({ from: "addr", to: null, txid: "0xabc" }, "nep17")).toBe("Burn");
    });

    it("returns Transfer for normal transfer", () => {
      expect(getTypeLabel({ from: "a", to: "b", txid: "0xabc" }, "nep17")).toBe("Transfer");
    });
  });

  describe("getTypeBadge", () => {
    it("returns badge classes for known type", () => {
      expect(getTypeBadge({ from: null, to: null, txid: "0xabc" }, "nep11")).toContain("bg-green");
    });

    it("returns empty string for unknown combination", () => {
      const badge = getTypeBadge({ from: "a", to: "b", txid: "0x1" }, "nep17");
      expect(badge).toContain("bg-primary");
    });
  });
});
