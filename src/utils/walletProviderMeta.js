import { PROVIDERS } from "@/constants/walletProviders";

export function getProviderUnavailableReasonKey(provider) {
  if (provider === PROVIDERS.WALLETCONNECT) return "header.providerWalletConnect";
  if (provider === PROVIDERS.NEON) return "header.providerNeon";
  if (provider === PROVIDERS.TESTNET_WIF) return "header.providerTestnetWif";
  if (provider === PROVIDERS.ONEGATE) return "header.providerOneGate";
  if (provider === PROVIDERS.NEOLINE) return "header.providerNeoLine";
  if (provider === PROVIDERS.EVM_WALLET) return "header.providerEvm";
  return "header.providerUnavailable";
}

export function getProviderInstallUrl(provider) {
  if (provider === PROVIDERS.NEOLINE) return "https://neoline.io/en/";
  if (provider === PROVIDERS.ONEGATE) return "https://onegate.space/";
  if (provider === PROVIDERS.WALLETCONNECT) return "https://walletconnect.network/";
  if (provider === PROVIDERS.NEON) return "https://neon.coz.io/";
  if (provider === PROVIDERS.EVM_WALLET) return "https://metamask.io/download/";
  return "";
}
