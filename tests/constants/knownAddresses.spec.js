import { describe, expect, it } from "vitest";
import { getKnownAddressEntries, getTreasuryKnownAddresses } from "@/constants/knownAddresses";

describe("knownAddresses helpers", () => {
  it("returns structured known-address records with logos when available", () => {
    const records = getKnownAddressEntries();
    const binance = records.find((entry) => entry.address === "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp");

    expect(binance).toEqual({
      address: "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp",
      name: "Binance",
      logo: "/img/known/binance.svg",
    });
  });

  it("lists treasury addresses as structured records", () => {
    const treasury = getTreasuryKnownAddresses();

    expect(treasury).toContainEqual({
      address: "NfM3NJFuDtBwZchLh6DYpk1yPigRNmjcTQ",
      name: "Neo Bond",
      logo: null,
    });
  });
});
