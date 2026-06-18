import { ref } from "vue";

export const connectedAccount = ref("");
export const connectedWalletProvider = ref("");
export const connectedWalletAccount = ref(null);
export const walletNetworkError = ref("");

export function setWalletState(snapshot = {}) {
  const account = snapshot.account || null;
  const address = String(account?.address || "").trim();
  connectedAccount.value = snapshot.connected === false ? "" : address;
  connectedWalletProvider.value = snapshot.connected === false ? "" : String(snapshot.provider || account?.label || "").trim();
  connectedWalletAccount.value = snapshot.connected === false ? null : account;
  walletNetworkError.value = String(snapshot.networkError || "").trim();
}

export function clearWalletState() {
  setWalletState({ connected: false });
}
