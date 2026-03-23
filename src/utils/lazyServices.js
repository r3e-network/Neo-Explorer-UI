let walletServicePromise = null;
const walletServiceLoaders = import.meta.glob("../services/walletService.js");

export async function loadWalletService() {
  if (!walletServicePromise) {
    walletServicePromise = walletServiceLoaders["../services/walletService.js"]().then((module) => module.walletService);
  }
  return walletServicePromise;
}
