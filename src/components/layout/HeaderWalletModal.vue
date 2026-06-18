<template>
  <transition name="fade" appear>
    <div
      ref="modalRef"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-transparent p-5"
      role="dialog"
      aria-modal="true"
      :aria-label="$t('header.connectWallet')"
      tabindex="0"
      @keydown.escape="emit('close')"
      @click.self="emit('close')"
    >
      <div class="wallet-modal-panel w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 text-slate-100 ring-1 ring-white/10 shadow-2xl overflow-hidden relative" @click.stop>
        <div class="wallet-modal-header px-7 py-5 flex items-center justify-between border-b border-white/10">
          <h2 class="wallet-modal-title text-lg font-bold">{{ $t('header.connectWallet') }}</h2>
          <button :aria-label="$t('aria.closeWalletDialog')" @click="emit('close')" class="wallet-modal-close rounded-lg p-2 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div class="p-7 space-y-4">
          <button
            v-for="(provider, index) in props.supportedProviders"
            :key="provider"
            :disabled="props.walletLoading"
            :title="isAvailable(provider) ? provider : props.getProviderUnavailableReason(provider)"
            :aria-label="getProviderAriaLabel(provider)"
            :aria-describedby="isAvailable(provider) ? undefined : getProviderHelpId(index)"
            @click="onProviderClick(provider)"
            class="wallet-modal-option w-full flex items-center justify-between gap-4 p-5 rounded-xl border text-slate-100 transition-all group disabled:cursor-not-allowed disabled:opacity-60"
            :class="isAvailable(provider)
              ? 'border-white/10 bg-slate-800 hover:bg-slate-700 hover:border-emerald-400/40'
              : 'wallet-modal-option--unavailable border-amber-300/25 bg-slate-800/80 hover:bg-slate-700 hover:border-amber-300/45'"
          >
            <div class="flex min-w-0 items-center gap-4">
              <div class="wallet-modal-icon-shell h-11 w-11 rounded-full shadow-sm flex items-center justify-center border border-slate-200/80 bg-white p-2">
                <img v-if="provider === 'NeoLine'" :src="'/img/brand/neoline.svg'" alt="NeoLine" class="wallet-modal-logo-wordmark h-5 w-5 object-cover object-left" onerror="this.src='/img/brand/neo.png'" />
                <img v-else-if="provider === 'WalletConnect'" :src="'/img/brand/walletconnect.ico'" alt="WalletConnect" class="w-full h-full object-contain" onerror="this.src='/img/brand/neo.png'" />
                <img v-else-if="provider === 'Neon Wallet'" :src="'/img/brand/neon.ico'" alt="Neon Wallet" class="w-full h-full object-contain" />
                <img v-else-if="provider === 'Testnet WIF (Local Dev)'" :src="'/img/brand/neo.png'" alt="Testnet WIF (Local Dev)" class="w-full h-full object-contain" />
                <img v-else-if="provider === 'OneGate'" :src="'/img/brand/onegate.ico'" alt="OneGate" class="w-full h-full object-contain" />
                <img v-else-if="provider === 'Google / Email (Web3Auth)'" :src="'/img/brand/web3auth.png'" alt="Web3Auth" class="w-full h-full object-contain" onerror="this.src='/img/brand/neo.png'" />
                <img v-else-if="provider === 'EVM Wallets (MetaMask, OKX, Rabby, etc.)'" src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" class="w-full h-full object-contain" />
                <svg v-else class="w-6 h-6 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 15.92 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>
              </div>
              <span class="min-w-0 text-left">
                <span class="wallet-modal-option-label block truncate font-semibold group-hover:text-emerald-600">{{ provider }}</span>
                <span
                  v-if="!isAvailable(provider)"
                  :id="getProviderHelpId(index)"
                  class="wallet-modal-option-help mt-1 block text-xs leading-snug text-amber-100/80"
                >
                  {{ props.getProviderUnavailableReason(provider) }}
                </span>
              </span>
            </div>
            <span
              v-if="!isAvailable(provider)"
              class="wallet-modal-option-action shrink-0 rounded-full border border-amber-300/30 px-2 py-1 text-[11px] font-semibold text-amber-100/90"
            >
              {{ $t('header.open') }}
            </span>
            <svg v-else class="wallet-modal-chevron h-5 w-5 shrink-0 transition-colors group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </button>

          <div v-if="showDevWifForm" class="wallet-modal-dev-panel mt-4 rounded-xl border border-white/10 bg-slate-950 p-4 space-y-3">
            <div>
              <label class="block text-sm font-medium wallet-modal-label mb-1">{{ $t('inline.walletWifLabel') }}</label>
              <input
                v-model="devWifInput"
                type="password"
                class="form-input w-full font-mono text-sm"
                :placeholder="$t('header.devWifPlaceholder')"
                autocomplete="off"
              />
            </div>
            <div class="flex gap-2">
              <button
                @click="onConfirmDevWif"
                :disabled="props.walletLoading || !devWifInput.trim()"
                class="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {{ $t('header.connectTestnetWif') }}
              </button>
              <button
                @click="resetDevWifForm"
                class="wallet-modal-secondary rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700"
              >
                {{ $t('header.cancel') }}
              </button>
            </div>
            <p class="wallet-modal-help text-xs">
              {{ $t('header.devWifHelp') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref } from "vue";
import { PROVIDERS } from "@/constants/walletProviders";
import { useFocusTrap } from "@/composables/useFocusTrap";

const props = defineProps({
  supportedProviders: { type: Array, required: true },
  walletLoading: { type: Boolean, default: false },
  isProviderAvailable: { type: Function, required: true },
  getProviderUnavailableReason: { type: Function, required: true },
});

const emit = defineEmits(["close", "connect", "dev-wif-connect"]);

const modalRef = ref(null);
useFocusTrap(modalRef);

const showDevWifForm = ref(false);
const devWifInput = ref("");

function resetDevWifForm() {
  showDevWifForm.value = false;
  devWifInput.value = "";
}

function isAvailable(provider) {
  return props.isProviderAvailable(provider);
}

function getProviderHelpId(index) {
  return `wallet-provider-help-${index}`;
}

function getProviderAriaLabel(provider) {
  if (isAvailable(provider)) return provider;
  return `${provider}. ${props.getProviderUnavailableReason(provider)}`;
}

function onProviderClick(provider) {
  if (provider === PROVIDERS.TESTNET_WIF) {
    if (!isAvailable(provider)) {
      emit("connect", provider);
      return;
    }
    showDevWifForm.value = true;
    return;
  }
  emit("connect", provider);
}

function onConfirmDevWif() {
  const wif = devWifInput.value.trim();
  if (!wif) return;
  emit("dev-wif-connect", wif);
}
</script>
