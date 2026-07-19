<template>
  <button
    type="button"
    class="btn-outline gap-1.5 px-3 py-1.5 text-xs"
    :disabled="pending"
    :aria-label="tf('neoX.addToWalletAria', 'Add the Neo X network to your EVM wallet')"
    @click="onClick"
  >
    <svg v-if="!pending" class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m9-3v6m3-3H9"
      />
    </svg>
    <svg v-else class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
    {{ tf("neoX.addToWallet", "Add Neo X to Wallet") }}
  </button>
</template>

<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "vue-toastification";
import { getNeoxNet, getNeoxLabel } from "@/utils/neoxEnv";
import { addNeoxChainToWallet, isUserRejection } from "@/utils/neoxWallet";

// One-click EIP-3326/3085 "switch or add Neo X" for injected EVM wallets
// (MetaMask etc.). The wallet's own approval prompt is the consent surface.
const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};
const toast = useToast();
const pending = ref(false);

async function onClick() {
  if (pending.value) return;
  pending.value = true;
  const net = getNeoxNet();
  try {
    const outcome = await addNeoxChainToWallet(net);
    toast.success(
      outcome === "added"
        ? `${getNeoxLabel(net)} ${tf("neoX.walletChainAdded", "added to your wallet")}`
        : `${tf("neoX.walletSwitched", "Wallet switched to")} ${getNeoxLabel(net)}`
    );
  } catch (error) {
    if (error?.code === "NO_EVM_WALLET") {
      toast.error(tf("neoX.noEvmWallet", "No EVM wallet detected. Install MetaMask to add Neo X."));
    } else if (isUserRejection(error)) {
      toast.info(tf("neoX.walletRequestRejected", "Wallet request cancelled."));
    } else {
      toast.error(error?.message || tf("neoX.walletRequestFailed", "Wallet request failed."));
    }
  } finally {
    pending.value = false;
  }
}
</script>
