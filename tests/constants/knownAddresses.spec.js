import { describe, expect, it } from "vitest";
import {
  getKnownAddressEntries,
  getKnownAddressLogo,
  getKnownAddressName,
  getTreasuryKnownAddresses,
} from "@/constants/knownAddresses";

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

  it("labels the R3E TEE address with the R3E logo", () => {
    const address = "NN8tbpgAx8zm5BNJZEqvi71Rj2Z8LX2RHh";

    expect(getKnownAddressName(address)).toBe("R3E TEE");
    expect(getKnownAddressLogo(address)).toBe("https://github.com/R3E-Network.png");
    expect(getKnownAddressEntries()).toContainEqual({
      address,
      name: "R3E TEE",
      logo: "https://github.com/R3E-Network.png",
    });
  });
});
