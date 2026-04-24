<template>
  <header class="app-header sticky top-0 z-50">
    <!-- Utility Bar -->
    <UtilityBar
      ref="utilityBarRef"
      :neo-price="neoPrice"
      :gas-price="gasPrice"
      :neo-price-change="neoPriceChange"
      :network-fee="networkFee"
      :current-network-label="currentNetworkLabel"
      :current-network="currentNetwork"
      :networks="NETWORKS"
      :network-dropdown-open="networkDropdownOpen"
      @select-network="selectNetwork"
      @toggle-network-dropdown="networkDropdownOpen = !networkDropdownOpen"
    />

    <!-- Main Nav Bar -->
    <nav class="main-nav relative border-b border-white/10 dark:border-neo-green/10 bg-white/70 dark:bg-[#071520]/70 shadow-lg backdrop-blur-xl transition-all duration-300">
      <div class="mx-auto flex h-[70px] max-w-[1400px] items-center px-4">
        <!-- Logo -->
        <router-link to="/homepage" class="mr-8 flex items-center gap-2.5 no-underline group">
          <div
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 p-1.5 shadow-[0_0_15px_rgba(0,229,153,0.1)] transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_25px_rgba(0,229,153,0.3)]"
          >
            <img src="/img/brand/neo.png" alt="Neo N3 Logo" class="h-full w-full object-contain" />
          </div>
          <span class="text-xl font-extrabold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-neo-green bg-clip-text text-transparent transition-all duration-300">
            Neo Explorer
          </span>
        </router-link>

        <!-- Desktop Nav -->
        <DesktopNav :active-dropdown="activeDropdown" @open-dropdown="openDropdown" @close-dropdown="closeDropdown" />

        <!-- Header Search (compact mode) -->
        <div class="ml-auto hidden w-full max-w-sm items-center lg:flex lg:ml-8">
          <SearchBox mode="compact" @search="handleSearch" />
        </div>

        <div v-if="connectedAccount" class="relative ml-3 hidden lg:block">
          <button
            data-testid="chat-notifications-button"
            aria-label="Chat notifications"
            class="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line-soft bg-surface-base text-high transition hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-emerald-400"
            @click="toggleChatNotifications"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h8M8 14h5m-9 5h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span
              v-if="unreadCount > 0"
              data-testid="chat-unread-badge"
              class="absolute -right-1.5 -top-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white shadow"
            >
              {{ unreadCount > 99 ? "99+" : unreadCount }}
            </span>
          </button>

          <div
            v-if="chatNotificationsOpen"
            class="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-line-soft bg-surface-base p-3 shadow-2xl"
          >
            <div class="mb-2 flex items-center justify-between">
              <p class="text-sm font-semibold text-high">NeoChat</p>
              <button class="text-xs font-medium text-emerald-600 hover:text-emerald-500" @click="openChatPage">
                {{ $t('header.open') }}
              </button>
            </div>
            <div v-if="notifications.length === 0" class="rounded-xl bg-surface-muted px-3 py-4 text-sm text-mid">
              {{ $t('header.noUnreadMessages') }}
            </div>
            <button
              v-for="notification in notifications"
              :key="notification.roomId"
              data-testid="chat-notification-item"
              class="mb-2 flex w-full items-start gap-3 rounded-xl bg-surface-muted px-3 py-3 text-left transition hover:bg-emerald-50/60 dark:hover:bg-emerald-900/10"
              @click="handleChatNotificationClick(notification)"
            >
              <div class="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-600">
                {{ getNotificationInitials(notification) }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                  <p class="truncate text-sm font-semibold text-high">
                    {{ notification.otherParticipantLabel || notification.otherParticipantAddress }}
                  </p>
                  <span
                    v-if="notification.unreadCount"
                    class="inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white"
                  >
                    {{ notification.unreadCount }}
                  </span>
                </div>
                <p class="mt-1 truncate text-xs text-mid">{{ notification.preview || $t('header.newMessage') }}</p>
              </div>
            </button>
          </div>
        </div>

        <!-- Global Wallet Button (desktop) -->
        <button
          class="ml-3 hidden shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all min-w-[10rem] lg:inline-flex shadow-sm active:scale-95"
          :class="connectedAccount ? 'bg-white border border-gray-200 text-gray-800 hover:border-emerald-500 hover:text-emerald-600 dark:bg-slate-800/80 dark:border-slate-700 dark:text-gray-100 dark:hover:border-emerald-500/50' : 'bg-emerald-500 border border-transparent text-white hover:bg-emerald-600 shadow-emerald-500/20'"
          :disabled="walletLoading"
          @click="toggleWallet"
        >
          <svg v-if="!connectedAccount && !walletLoading" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
          <span
            v-else-if="connectedAccount"
            class="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
          ></span>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          {{ walletLoading ? $t('header.connecting') : walletButtonLabel }}
        </button>

        <!-- Mobile Wallet -->
        <button
          class="ml-auto mr-2 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition active:scale-95 lg:hidden"
          :class="connectedAccount ? 'bg-white border border-gray-200 text-gray-800 hover:border-emerald-500 hover:text-emerald-600 dark:bg-slate-800/80 dark:border-slate-700 dark:text-gray-100 dark:hover:border-emerald-500/50' : 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600'"
          :disabled="walletLoading"
          @click="toggleWallet"
        >
          {{ walletLoading ? "..." : mobileWalletLabel }}
        </button>
        <MobileMenu :open="mobileMenuOpen" @toggle="mobileMenuOpen = !mobileMenuOpen" class="lg:hidden" />
      </div>

      <!-- Mobile Slide-out Menu -->
      <transition name="slide">
        <div
          v-show="mobileMenuOpen"
          class="border-t border-white/10 dark:border-neo-green/10 bg-white/90 dark:bg-[#071520]/95 px-4 py-4 backdrop-blur-xl lg:hidden absolute w-full shadow-2xl"
        >
          <div class="mb-4">
            <SearchBox mode="compact" @search="handleMobileSearch" />
          </div>
          <button
            class="mb-4 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition active:scale-95 flex items-center gap-2"
            :class="connectedAccount ? 'bg-surface border border-line-soft text-high hover:border-emerald-500' : 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 border border-transparent'"
            :disabled="walletLoading"
            @click="toggleWallet"
          >
            <span v-if="connectedAccount" class="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
            {{ walletLoading ? $t('header.connectingWallet') : mobilePanelWalletLabel }}
          </button>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <router-link to="/homepage" class="mobile-link" @click="closeMobile">{{ $t("nav.home") }}</router-link>
            <router-link to="/blocks/1" class="mobile-link" @click="closeMobile">{{ $t("nav.blocks") }}</router-link>
            <router-link to="/transactions/1" class="mobile-link" @click="closeMobile">{{ $t("nav.transactions") }}</router-link>
            <router-link to="/tokens/nep17/1" class="mobile-link" @click="closeMobile">{{ $t("nav.tokens") }}</router-link>
            <router-link to="/contracts/1" class="mobile-link" @click="closeMobile">{{ $t("nav.contracts") }}</router-link>
            <router-link to="/account/1" class="mobile-link" @click="closeMobile">{{ $t("nav.accounts") }}</router-link>
            <router-link to="/candidates/1" class="mobile-link" @click="closeMobile">{{ $t("nav.consensusNodes") }}</router-link>
            <router-link to="/governance" class="mobile-link" @click="closeMobile">{{ $t("nav.governance") }}</router-link>
            <router-link to="/nns" class="mobile-link" @click="closeMobile">{{ $t('header.nnsDomains') }}</router-link>
            <router-link to="/matrix" class="mobile-link" @click="closeMobile">{{ $t('header.matrixDomain') }}</router-link>
            <router-link to="/echarts" class="mobile-link" @click="closeMobile">{{ $t("nav.chartsStats") }}</router-link>
            <router-link to="/burn" class="mobile-link" @click="closeMobile">{{ $t("nav.burnedGas") }}</router-link>
            <router-link to="/gas-tracker" class="mobile-link" @click="closeMobile">{{ $t("nav.gasTracker") }}</router-link>
            <router-link to="/api-docs" class="mobile-link" @click="closeMobile">{{ $t("nav.apiDocs") }}</router-link>
            <router-link to="/verify-contract/" class="mobile-link" @click="closeMobile">{{ $t("nav.verifyContract") }}</router-link>
            <router-link to="/tools" class="mobile-link" @click="closeMobile">{{ $t("nav.tools") }}</router-link>
          </div>
        </div>
      </transition>
    </nav>
  
    <transition name="fade">
      <div
        v-if="showWalletModal"
        class="fixed inset-0 z-[200] flex items-center justify-center bg-transparent p-5"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('header.connectWallet')"
        tabindex="0"
        @keydown.escape="showWalletModal = false; resetDevWifForm()"
        @click.self="showWalletModal = false; resetDevWifForm()"
      >
        <div class="wallet-modal-panel w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 text-slate-100 ring-1 ring-white/10 shadow-2xl overflow-hidden relative" @click.stop>
          <div class="wallet-modal-header px-7 py-5 flex items-center justify-between border-b border-white/10">
            <h2 class="wallet-modal-title text-lg font-bold">{{ $t('header.connectWallet') }}</h2>
            <button aria-label="Close wallet dialog" @click="showWalletModal = false; resetDevWifForm()" class="wallet-modal-close rounded-lg p-2 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          <div class="p-7 space-y-4">
            <button 
              v-for="provider in supportedProviders" 
              :key="provider"
              :disabled="walletLoading"
              :title="isProviderAvailable(provider) ? provider : getProviderUnavailableReason(provider)"
              @click="handleConnect(provider)"
              class="wallet-modal-option w-full flex items-center justify-between p-5 rounded-xl border border-white/10 bg-slate-800 text-slate-100 transition-all group disabled:cursor-not-allowed disabled:opacity-60 hover:bg-slate-700 hover:border-emerald-400/40"
            >
              <div class="flex items-center gap-4">
                <div class="wallet-modal-icon-shell h-11 w-11 rounded-full shadow-sm flex items-center justify-center border border-slate-200/80 bg-white p-2">
                  <img v-if="provider === 'NeoLine'" :src="'/img/brand/neoline.svg'" alt="NeoLine" class="wallet-modal-logo-wordmark h-5 w-5 object-cover object-left" onerror="this.src='/img/brand/neo.png'" />
                  <img v-else-if="provider === 'O3'" :src="'/img/brand/o3.png'" alt="O3" class="w-full h-full object-contain" onerror="this.src='/img/brand/neo.png'" />
                  <img v-else-if="provider === 'WalletConnect'" :src="'/img/brand/walletconnect.ico'" alt="WalletConnect" class="w-full h-full object-contain" onerror="this.src='/img/brand/neo.png'" />
                  <img v-else-if="provider === 'Neon Wallet'" :src="'/img/brand/neon.ico'" alt="Neon Wallet" class="w-full h-full object-contain" />
                  <img v-else-if="provider === 'Testnet WIF (Local Dev)'" :src="'/img/brand/neo.png'" alt="Testnet WIF (Local Dev)" class="w-full h-full object-contain" />
                  <img v-else-if="provider === 'OneGate'" :src="'/img/brand/onegate.ico'" alt="OneGate" class="w-full h-full object-contain" />
                  <img v-else-if="provider === 'Google / Email (Web3Auth)'" :src="'/img/brand/web3auth.png'" alt="Web3Auth" class="w-full h-full object-contain" onerror="this.src='/img/brand/neo.png'" />
                  <img v-else-if="provider === 'EVM Wallets (MetaMask, OKX, Rabby, etc.)'" src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" class="w-full h-full object-contain" />
                  <svg v-else class="w-6 h-6 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 15.92 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>
                </div>
                <span class="wallet-modal-option-label font-semibold group-hover:text-emerald-600">{{ provider }}</span>
              </div>
              <svg class="wallet-modal-chevron w-5 h-5 transition-colors group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </button>

            <div v-if="showDevWifForm" class="wallet-modal-dev-panel mt-4 rounded-xl border border-white/10 bg-slate-950 p-4 space-y-3">
              <div>
                <label class="block text-sm font-medium wallet-modal-label mb-1">Testnet WIF</label>
                <input
                  v-model="devWifInput"
                  type="password"
                  class="form-input w-full font-mono text-sm"
                  placeholder="Paste local testnet WIF"
                  autocomplete="off"
                />
              </div>
              <div class="flex gap-2">
                <button
                  @click="handleDevWifConnect"
                  :disabled="walletLoading || !devWifInput.trim()"
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
    
    <WalletConnectModal v-if="wcUri" :uri="wcUri" :visible="!!wcUri" @close="wcUri = ''" />

  </header>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, onActivated, onDeactivated } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import SearchBox from "@/components/common/SearchBox.vue";
import UtilityBar from "@/components/layout/UtilityBar.vue";
import DesktopNav from "@/components/layout/DesktopNav.vue";
import MobileMenu from "@/components/layout/MobileMenu.vue";
import { usePriceCache } from "@/composables/usePriceCache";
import { resolveSearchLocation } from "@/utils/searchRouting";
import { resolveSearchResultWithTimeout } from "@/utils/searchLookup";
import { DROPDOWN_CLOSE_DELAY_MS } from "@/constants";
import {
  NETWORK_CHANGE_EVENT,
  NETWORK_OPTIONS,
  getCurrentEnv,
  getNetworkLabel,
  setCurrentEnv,
} from "@/utils/env";
import { connectedAccount, disconnectWallet, initWallet } from "@/utils/wallet";
import { loadWalletService } from "@/utils/lazyServices";
import WalletConnectModal from "@/views/Contract/components/WalletConnectModal.vue";
import { PROVIDERS } from "@/constants/walletProviders";
import { useToast } from "vue-toastification";
import { useChatSession } from "@/composables/useChatSession";


const router = useRouter();
const { t } = useI18n();
const { fetchPrices } = usePriceCache();
const toast = useToast();
const {
  chatSession,
  unreadCount,
  notifications,
  restoreChatSession,
  refreshNotifications,
  clearChatSession,
} = useChatSession();

const NETWORKS = NETWORK_OPTIONS;

let searchServiceModulePromise = null;

const mobileMenuOpen = ref(false);
const networkDropdownOpen = ref(false);
const activeDropdown = ref(null);
const utilityBarRef = ref(null);
let dropdownTimeout = null;

const neoPrice = ref(0);
const gasPrice = ref(0);
const neoPriceChange = ref(0);
const gasPriceChange = ref(0);
const networkFee = ref(0);

const currentNetwork = ref(getCurrentEnv());
const walletLoading = ref(false);
const chatNotificationsOpen = ref(false);

const currentNetworkLabel = computed(() => getNetworkLabel(currentNetwork.value));
const walletButtonLabel = computed(() => {
  if (!connectedAccount.value) return t("header.connectWallet");
  return `${connectedAccount.value.slice(0, 6)}...${connectedAccount.value.slice(-4)}`;
});
const mobileWalletLabel = computed(() => (connectedAccount.value ? t("header.disconnect") : t("header.connectWallet")));
const mobilePanelWalletLabel = computed(() =>
  connectedAccount.value
    ? `${t("header.disconnect")} ${connectedAccount.value.slice(0, 6)}...${connectedAccount.value.slice(-4)}`
    : t("header.connectWallet")
);

function openDropdown(name) {
  if (dropdownTimeout) clearTimeout(dropdownTimeout);
  activeDropdown.value = name;
}

function closeDropdown(name) {
  dropdownTimeout = setTimeout(() => {
    if (activeDropdown.value === name) activeDropdown.value = null;
  }, DROPDOWN_CLOSE_DELAY_MS);
}

function closeMobile() {
  mobileMenuOpen.value = false;
}

const showWalletModal = ref(false);
const availableProviders = ref([]);
const supportedProviders = ref([]);
const wcUri = ref("");
const showDevWifForm = ref(false);
const devWifInput = ref("");

function isProviderAvailable(provider) {
  return availableProviders.value.includes(provider);
}

function getProviderUnavailableReason(provider) {
  if (provider === PROVIDERS.WALLETCONNECT) {
    return t("header.providerWalletConnect");
  }
  if (provider === PROVIDERS.NEON) {
    return t("header.providerNeon");
  }
  if (provider === PROVIDERS.TESTNET_WIF) {
    return t("header.providerTestnetWif");
  }
  if (provider === PROVIDERS.ONEGATE) {
    return t("header.providerOneGate");
  }
  if (provider === PROVIDERS.O3) {
    return t("header.providerO3");
  }
  if (provider === PROVIDERS.NEOLINE) {
    return t("header.providerNeoLine");
  }
  if (provider === PROVIDERS.EVM_WALLET) {
    return t("header.providerEvm");
  }
  return t("header.providerUnavailable");
}

function getProviderInstallUrl(provider) {
  if (provider === PROVIDERS.NEOLINE) {
    return "https://neoline.io/en/";
  }
  if (provider === PROVIDERS.O3) {
    return "https://www.o3.network/";
  }
  if (provider === PROVIDERS.ONEGATE) {
    return "https://onegate.space/";
  }
  if (provider === PROVIDERS.WALLETCONNECT) {
    return "https://walletconnect.network/";
  }
  if (provider === PROVIDERS.NEON) {
    return "https://neon.coz.io/";
  }
  if (provider === PROVIDERS.TESTNET_WIF) {
    return "";
  }
  if (provider === PROVIDERS.EVM_WALLET) {
    return "https://metamask.io/download/";
  }
  return "";
}

function resetDevWifForm() {
  showDevWifForm.value = false;
  devWifInput.value = "";
}

async function handleConnect(provider) {
  if (provider === PROVIDERS.TESTNET_WIF) {
    if (!isProviderAvailable(provider)) {
      toast.info(getProviderUnavailableReason(provider));
      return;
    }
    showDevWifForm.value = true;
    return;
  }
  if (!isProviderAvailable(provider)) {
    const installUrl = getProviderInstallUrl(provider);
    if (installUrl && typeof window !== "undefined" && typeof window.open === "function") {
      window.open(installUrl, "_blank", "noopener,noreferrer");
      return;
    }
    toast.info(getProviderUnavailableReason(provider));
    return;
  }
  showWalletModal.value = false;
  walletLoading.value = true;
  try {
     const walletService = await loadWalletService();
     const result = await walletService.connect(provider);
     if (result?.uri && result?.approval) {
        wcUri.value = result.uri;
        walletLoading.value = false;
        
        try {
          const account = await result.approval;
          wcUri.value = "";
          connectedAccount.value = account.address;
          localStorage.setItem("connectedWallet", account.address);
          localStorage.setItem("walletProvider", provider);
          await bootstrapChatSession();
          toast.success(t('header.connectedAs', { address: `${account.address.slice(0, 6)}...${account.address.slice(-4)}` }));
        } catch(e) {
          wcUri.value = "";
          toast.error(e?.message || t('header.walletConnectRejected'));
        }
        return;
     }
     
     if (result && result.address) {
       connectedAccount.value = result.address;
       if (result.persistSession === "session") {
         sessionStorage.setItem("connectedWallet", result.address);
         sessionStorage.setItem("walletProvider", provider);
         sessionStorage.setItem("devTestWif", devWifInput.value.trim());
       } else if (result.persistSession !== false) {
         localStorage.setItem("connectedWallet", result.address);
         localStorage.setItem("walletProvider", provider);
       }
       resetDevWifForm();
       showWalletModal.value = false;
       await bootstrapChatSession();
       toast.success(t('header.connectedAs', { address: `${result.address.slice(0, 6)}...${result.address.slice(-4)}` }));
     }
  } catch (err) {
     let errMsg = err?.message;
     if (!errMsg && err?.description) errMsg = err.description;
     if (!errMsg && err?.error?.message) errMsg = err.error.message;
     toast.error(errMsg || t('header.connectWalletFailed'));
  } finally {
     walletLoading.value = false;
  }
}

async function handleDevWifConnect() {
  walletLoading.value = true;
  try {
    const walletService = await loadWalletService();
    const result = await walletService.connect(PROVIDERS.TESTNET_WIF, {
      wif: devWifInput.value.trim(),
    });
    if (result?.address) {
      connectedAccount.value = result.address;
      if (result.persistSession === "session") {
        sessionStorage.setItem("connectedWallet", result.address);
        sessionStorage.setItem("walletProvider", PROVIDERS.TESTNET_WIF);
        sessionStorage.setItem("devTestWif", devWifInput.value.trim());
      }
      resetDevWifForm();
      showWalletModal.value = false;
      await bootstrapChatSession();
      toast.success(t('header.connectedAs', { address: `${result.address.slice(0, 6)}...${result.address.slice(-4)}` }));
    }
  } catch (err) {
    const errMsg = err?.message || err?.description || t('header.connectWalletFailed');
    toast.error(errMsg);
  } finally {
    walletLoading.value = false;
  }
}

async function toggleWallet() {
  if (walletLoading.value) return;
  walletLoading.value = true;
  try {
    if (connectedAccount.value) {
      await disconnectWallet();
      const walletService = await loadWalletService();
      walletService.disconnect();
      localStorage.removeItem("walletProvider");
      clearChatSession();
      return;
    }
    const walletService = await loadWalletService();
    availableProviders.value = walletService.getAvailableProviders();
    supportedProviders.value = typeof walletService.getSupportedProviders === "function"
      ? walletService.getSupportedProviders()
      : walletService.getAvailableProviders();
    resetDevWifForm();
    showWalletModal.value = true;
  } finally {
    walletLoading.value = false;
  }
}

function selectNetwork(net) {
  const previousNetwork = currentNetwork.value;
  const nextNetwork = setCurrentEnv(net.id);

  currentNetwork.value = nextNetwork;
  networkDropdownOpen.value = false;

  if (nextNetwork !== previousNetwork) {
    activeDropdown.value = null;
    mobileMenuOpen.value = false;
  }
}

function handleNetworkChange(event) {
  currentNetwork.value = event?.detail?.env || getCurrentEnv();
}

function handleClickOutside(e) {
  const networkDropdownEl = utilityBarRef.value?.networkDropdown;
  if (networkDropdownEl && !networkDropdownEl.contains(e.target)) {
    networkDropdownOpen.value = false;
  }
  const chatDropdownEl = document.querySelector('[data-testid="chat-notifications-button"]')?.parentElement;
  if (chatDropdownEl && !chatDropdownEl.contains(e.target)) {
    chatNotificationsOpen.value = false;
  }
}

async function loadSearchService() {
  if (!searchServiceModulePromise) {
    searchServiceModulePromise = import("@/services/searchService");
  }

  const module = await searchServiceModulePromise;
  return module.searchService;
}

async function handleSearch(query) {
  if (!query) return;
  try {
    const searchService = await loadSearchService();
    const result = await resolveSearchResultWithTimeout((q) => searchService.search(q), query);
    const location = resolveSearchLocation(query, result);
    if (location) router.push(location).catch(() => {});
  } catch (err) {
    if (import.meta.env.DEV) console.error("Search failed, falling back to default routing:", err);
    const location = resolveSearchLocation(query, null);
    if (location) router.push(location).catch(() => {});
  }
}

function handleMobileSearch(query) {
  closeMobile();
  handleSearch(query);
}

function calculateNetworkFee() {
  return 0.003;
}

async function loadPrices() {
  const data = await fetchPrices();
  neoPrice.value = data.neo;
  gasPrice.value = data.gas;
  neoPriceChange.value = data.neoChange;
  gasPriceChange.value = data.gasChange;
  networkFee.value = calculateNetworkFee();
}

async function bootstrapChatSession() {
  try {
    await restoreChatSession();
    if (connectedAccount.value && chatSession.value) {
      await refreshNotifications();
    }
  } catch (_err) {
    // Chat restore is best-effort.
  }
}

function getNotificationInitials(notification) {
  const label = String(notification?.otherParticipantLabel || notification?.otherParticipantAddress || "?").trim();
  if (!label) return "?";
  return label.slice(0, 2).toUpperCase();
}

async function toggleChatNotifications() {
  chatNotificationsOpen.value = !chatNotificationsOpen.value;
  if (chatNotificationsOpen.value && connectedAccount.value && chatSession.value) {
    try {
      await refreshNotifications();
    } catch {
      // Best-effort — don't break the UI if notifications fail to load
    }
  }
}

function openChatPage() {
  chatNotificationsOpen.value = false;
  Promise.resolve(router.push({ path: "/chat" })).catch(() => {});
}

function handleChatNotificationClick(notification) {
  chatNotificationsOpen.value = false;
  Promise.resolve(router.push({
    path: "/chat",
    query: { room: notification.roomId },
  })).catch(() => {});
}

onMounted(async () => {
  currentNetwork.value = getCurrentEnv();

  // Initialize wallet state
  void Promise.resolve(initWallet()).then(() => bootstrapChatSession());

  try {
    await loadPrices();
  } catch (err) {
    if (import.meta.env.DEV) console.error("Failed to load prices:", err);
  }
  window.addEventListener(NETWORK_CHANGE_EVENT, handleNetworkChange);
  document.addEventListener("click", handleClickOutside);
});

onActivated(() => {
  document.removeEventListener("click", handleClickOutside);
  document.addEventListener("click", handleClickOutside);
});

onDeactivated(() => {
  document.removeEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  window.removeEventListener(NETWORK_CHANGE_EVENT, handleNetworkChange);
  document.removeEventListener("click", handleClickOutside);
  if (dropdownTimeout) clearTimeout(dropdownTimeout);
});
</script>

<style>
.mobile-link {
  @apply rounded-lg border border-white/20 px-2 py-2 text-center text-white/80 no-underline transition;
}

.mobile-link:hover {
  @apply text-white;
  background: rgba(255, 255, 255, 0.13);
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
}

.wallet-modal-panel {
  box-shadow:
    0 28px 80px rgba(2, 6, 23, 0.72),
    0 1px 0 rgba(255, 255, 255, 0.04) inset;
}

.wallet-modal-title {
  color: #f8fafc;
  letter-spacing: -0.01em;
}

.wallet-modal-close {
  color: #94a3b8;
}

.wallet-modal-close:hover {
  color: #f8fafc;
  background: #0f172a;
}

.wallet-modal-option {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.wallet-modal-option:hover {
  transform: translateY(-1px);
  box-shadow:
    0 18px 32px rgba(2, 6, 23, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.wallet-modal-option-label {
  color: #f8fafc;
}

.wallet-modal-chevron {
  color: #94a3b8;
}

.wallet-modal-icon-shell {
  box-shadow: 0 12px 24px rgba(2, 6, 23, 0.26);
}

.wallet-modal-dev-panel {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.wallet-modal-label {
  color: #e2e8f0;
}

.wallet-modal-help {
  color: #94a3b8;
}
</style>
