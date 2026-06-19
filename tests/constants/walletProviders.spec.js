import { describe, expect, it } from "vitest";
import { CONTRACT_WRITE_WALLET_PROVIDERS, PROVIDERS } from "@/constants/walletProviders";

describe("wallet provider constants", () => {
  it("offers every general Neo write-capable wallet in the contract write tab", () => {
    expect(CONTRACT_WRITE_WALLET_PROVIDERS).toEqual(
      expect.arrayContaining([
        PROVIDERS.NEOLINE,
        PROVIDERS.ONEGATE,
        PROVIDERS.NEON,
        PROVIDERS.WALLETCONNECT,
        PROVIDERS.WEB3AUTH,
        PROVIDERS.EVM_WALLET,
      ]),
    );
    expect(CONTRACT_WRITE_WALLET_PROVIDERS).not.toContain(PROVIDERS.TESTNET_WIF);
  });
});
