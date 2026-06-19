import { describe, expect, it } from "vitest";
import { CONTRACT_WRITE_WALLET_PROVIDERS, PROVIDERS } from "@/constants/walletProviders";
import { getProviderInstallUrl } from "@/utils/walletProviderMeta";

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

  it("does not treat WalletConnect-style configuration gaps as install-page redirects", () => {
    expect(getProviderInstallUrl(PROVIDERS.WALLETCONNECT)).toBe("");
    expect(getProviderInstallUrl(PROVIDERS.NEON)).toBe("");
    expect(getProviderInstallUrl(PROVIDERS.NEOLINE)).toMatch(/^https:\/\//);
    expect(getProviderInstallUrl(PROVIDERS.ONEGATE)).toMatch(/^https:\/\//);
    expect(getProviderInstallUrl(PROVIDERS.EVM_WALLET)).toMatch(/^https:\/\//);
  });
});
