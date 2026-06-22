<template>
  <header class="app-header sticky top-0 z-50">
    <!-- Utility Bar -->
    <UtilityBar
      ref="utilityBarRef"
      :neo-price="neoPrice"
      :gas-price="gasPrice"
      :neo-price-change="neoPriceChange"
      :price-unavailable="priceUnavailable"
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
            :aria-label="$t('aria.chatNotifications')"
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
          :aria-label="walletControlAriaLabel"
          :title="walletControlTitle"
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
          :aria-label="walletControlAriaLabel"
          :title="walletControlTitle"
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
          class="absolute left-0 top-full z-50 max-h-[calc(100vh-7rem)] w-full overflow-y-auto border-t border-line-soft bg-white px-4 py-4 shadow-2xl dark:bg-[#071520] lg:hidden"
        >
          <div class="mb-4">
            <SearchBox mode="compact" @search="handleMobileSearch" />
          </div>
          <button
            class="mb-4 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition active:scale-95 flex items-center gap-2"
            :class="connectedAccount ? 'bg-surface border border-line-soft text-high hover:border-emerald-500' : 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 border border-transparent'"
            :disabled="walletLoading"
            :aria-label="walletControlAriaLabel"
            :title="walletControlTitle"
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
            <router-link to="/network-status" class="mobile-link" @click="closeMobile">{{ $t("nav.networkStatus") }}</router-link>
            <router-link to="/burn" class="mobile-link" @click="closeMobile">{{ $t("nav.burnedGas") }}</router-link>
            <router-link to="/gas-tracker" class="mobile-link" @click="closeMobile">{{ $t("nav.gasTracker") }}</router-link>
            <router-link to="/api-docs" class="mobile-link" @click="closeMobile">{{ $t("nav.apiDocs") }}</router-link>
            <router-link to="/verify-contract/" class="mobile-link" @click="closeMobile">{{ $t("nav.verifyContract") }}</router-link>
            <router-link to="/tools" class="mobile-link" @click="closeMobile">{{ $t("nav.tools") }}</router-link>
          </div>
        </div>
      </transition>
    </nav>

    <div
      v-if="walletAttentionMessage"
      data-testid="wallet-attention"
      role="status"
      aria-live="polite"
      class="border-b border-amber-300/30 bg-amber-50/95 text-amber-950 shadow-sm backdrop-blur dark:border-amber-300/20 dark:bg-amber-950/90 dark:text-amber-50"
    >
      <div class="mx-auto flex max-w-[1400px] items-start gap-3 px-4 py-2.5 text-sm">
        <span class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">!</span>
        <div class="min-w-0 flex-1">
          <p class="font-semibold">{{ $t('header.walletIssue', { provider: walletAttentionProvider }) }}</p>
          <p class="break-words text-xs leading-relaxed text-amber-900/90 dark:text-amber-100/90">{{ walletAttentionMessage }}</p>
        </div>
        <button
          data-testid="wallet-attention-disconnect"
          class="shrink-0 rounded-md border border-amber-400/50 px-2.5 py-1 text-xs font-semibold text-amber-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-amber-50 dark:hover:bg-amber-900"
          :disabled="walletLoading"
          @click="disconnectCurrentWallet"
        >
          {{ $t('header.disconnect') }}
        </button>
      </div>
    </div>
  
    <HeaderWalletModal
      v-if="showWalletModal"
      :supported-providers="supportedProviders"
      :wallet-loading="walletLoading"
      :is-provider-available="isProviderAvailable"
      :get-provider-unavailable-reason="getProviderUnavailableReason"
      @close="showWalletModal = false"
      @connect="handleConnect"
      @dev-wif-connect="handleDevWifConnect"
    />
    
    <WalletConnectModal v-if="wcUri" :uri="wcUri" :visible="!!wcUri" @close="cancelPendingWalletConnectApproval" />

  </header>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, onActivated, onDeactivated, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
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
import { connectedWalletProvider, walletNetworkError } from "@/utils/walletState";
import { truncateHash } from "@/utils/addressFormat";
import { loadWalletService } from "@/utils/lazyServices";
import WalletConnectModal from "@/views/Contract/components/WalletConnectModal.vue";
import HeaderWalletModal from "@/components/layout/HeaderWalletModal.vue";
import { PROVIDERS } from "@/constants/walletProviders";
import { getProviderInstallUrl, getProviderUnavailableReasonKey } from "@/utils/walletProviderMeta";
import { useToast } from "vue-toastification";
import { useChatSession } from "@/composables/useChatSession";


const router = useRouter();
const route = useRoute();
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
const priceUnavailable = ref(false);

const currentNetwork = ref(getCurrentEnv());
const walletLoading = ref(false);
const chatNotificationsOpen = ref(false);

const currentNetworkLabel = computed(() => getNetworkLabel(currentNetwork.value));
const walletButtonLabel = computed(() => {
  if (!connectedAccount.value) return t("header.connectWallet");
  return truncateHash(connectedAccount.value, 6, 4);
});
const walletAttentionMessage = computed(() => String(walletNetworkError.value || "").trim());
const walletAttentionProvider = computed(() => String(connectedWalletProvider.value || "").trim() || t("header.wallet"));
const walletControlTitle = computed(() => walletAttentionMessage.value || walletButtonLabel.value);
const walletControlAriaLabel = computed(() => {
  if (walletLoading.value) return t("header.connectingWallet");
  if (walletAttentionMessage.value) {
    return t("header.walletIssueAria", {
      provider: walletAttentionProvider.value,
      error: walletAttentionMessage.value,
    });
  }
  if (!connectedAccount.value) return t("header.connectWallet");
  return t("header.connectedWalletAria", { address: connectedAccount.value });
});
const mobileWalletLabel = computed(() => (connectedAccount.value ? t("header.disconnect") : t("header.connectWallet")));
const mobilePanelWalletLabel = computed(() =>
  connectedAccount.value
    ? `${t("header.disconnect")} ${truncateHash(connectedAccount.value, 6, 4)}`
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

// Close the mobile drawer on any route change — including history nav and
// router.push from inside other components — so it can never end up stuck
// open behind the freshly-rendered page.
watch(() => route.fullPath, (next, prev) => {
  if (next !== prev && mobileMenuOpen.value) closeMobile();
});

const showWalletModal = ref(false);
const availableProviders = ref([]);
const supportedProviders = ref([]);
const wcUri = ref("");
let walletNetworkValidationPromise = null;
let walletConnectionAttemptId = 0;
let pendingWalletConnectService = null;

function beginWalletConnectionAttempt() {
  walletConnectionAttemptId += 1;
  wcUri.value = "";
  pendingWalletConnectService?.cancelPendingConnection?.();
  pendingWalletConnectService = null;
  return walletConnectionAttemptId;
}

function cancelPendingWalletConnectApproval() {
  walletConnectionAttemptId += 1;
  wcUri.value = "";
  const walletService = pendingWalletConnectService;
  pendingWalletConnectService = null;
  walletService?.cancelPendingConnection?.();
}

function isCurrentWalletConnectionAttempt(attemptId) {
  return attemptId === walletConnectionAttemptId;
}

function isProviderAvailable(provider) {
  return availableProviders.value.includes(provider);
}

function getProviderUnavailableReason(provider) {
  return t(getProviderUnavailableReasonKey(provider));
}

function shouldShowWalletApprovalHint(provider) {
  return [
    PROVIDERS.NEOLINE,
    PROVIDERS.ONEGATE,
    PROVIDERS.WEB3AUTH,
    PROVIDERS.EVM_WALLET,
  ].includes(provider);
}

async function refreshWalletProviderAvailability(walletServiceArg = null) {
  const walletService = walletServiceArg || await loadWalletService();
  availableProviders.value = typeof walletService.getAvailableProviders === "function"
    ? walletService.getAvailableProviders()
    : [];
  supportedProviders.value = typeof walletService.getSupportedProviders === "function"
    ? walletService.getSupportedProviders()
    : availableProviders.value;
}

function refreshOpenWalletModalAvailability() {
  if (!showWalletModal.value || connectedAccount.value) return;
  refreshWalletProviderAvailability().catch(() => {
    availableProviders.value = [];
  });
}

function handleDocumentVisibilityChange() {
  if (document.visibilityState === "visible") refreshOpenWalletModalAvailability();
}

async function handleConnect(provider) {
  let walletService = null;
  try {
    walletService = await loadWalletService();
    await refreshWalletProviderAvailability(walletService);
  } catch (err) {
    toast.error(err?.message || t("header.connectWalletFailed"));
    return;
  }

  if (provider === PROVIDERS.TESTNET_WIF && !isProviderAvailable(provider)) {
    toast.info(getProviderUnavailableReason(provider));
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
  const connectionAttemptId = beginWalletConnectionAttempt();
  walletLoading.value = true;
  if (shouldShowWalletApprovalHint(provider)) {
    toast.info(t("header.waitingForWalletApproval"));
  }
  try {
    const result = await walletService.connect(provider);
    if (!isCurrentWalletConnectionAttempt(connectionAttemptId)) return;
    if (result?.uri && result?.approval) {
      pendingWalletConnectService = walletService;
      wcUri.value = result.uri;
      walletLoading.value = false;

      try {
        const account = await result.approval;
        if (!isCurrentWalletConnectionAttempt(connectionAttemptId) || !account?.address) return;
        wcUri.value = "";
        pendingWalletConnectService = null;
        connectedAccount.value = account.address;
        await bootstrapChatSession();
        toast.success(t("header.connectedAs", { address: truncateHash(account.address, 6, 4) }));
      } catch (e) {
        if (!isCurrentWalletConnectionAttempt(connectionAttemptId)) return;
        wcUri.value = "";
        pendingWalletConnectService = null;
        toast.error(e?.message || t("header.walletConnectRejected"));
      }
      return;
    }

    if (result?.address) {
      if (!isCurrentWalletConnectionAttempt(connectionAttemptId)) return;
      connectedAccount.value = result.address;
      showWalletModal.value = false;
      await bootstrapChatSession();
      toast.success(t("header.connectedAs", { address: truncateHash(result.address, 6, 4) }));
    }
  } catch (err) {
    if (!isCurrentWalletConnectionAttempt(connectionAttemptId)) return;
    let errMsg = err?.message;
    if (!errMsg && err?.description) errMsg = err.description;
    if (!errMsg && err?.error?.message) errMsg = err.error.message;
    toast.error(errMsg || t("header.connectWalletFailed"));
  } finally {
    if (isCurrentWalletConnectionAttempt(connectionAttemptId)) walletLoading.value = false;
  }
}

async function handleDevWifConnect(wif) {
  const connectionAttemptId = beginWalletConnectionAttempt();
  walletLoading.value = true;
  try {
    const walletService = await loadWalletService();
    const result = await walletService.connect(PROVIDERS.TESTNET_WIF, { wif });
    if (result?.address) {
      if (!isCurrentWalletConnectionAttempt(connectionAttemptId)) return;
      connectedAccount.value = result.address;
      showWalletModal.value = false;
      await bootstrapChatSession();
      toast.success(t("header.connectedAs", { address: truncateHash(result.address, 6, 4) }));
    }
  } catch (err) {
    if (!isCurrentWalletConnectionAttempt(connectionAttemptId)) return;
    const errMsg = err?.message || err?.description || t("header.connectWalletFailed");
    toast.error(errMsg);
  } finally {
    if (isCurrentWalletConnectionAttempt(connectionAttemptId)) walletLoading.value = false;
  }
}

async function toggleWallet() {
  if (walletLoading.value) return;
  cancelPendingWalletConnectApproval();
  if (connectedAccount.value) {
    await disconnectCurrentWallet();
    return;
  }

  walletLoading.value = true;
  try {
    const walletService = await loadWalletService();
    await refreshWalletProviderAvailability(walletService);
    showWalletModal.value = true;
  } finally {
    walletLoading.value = false;
  }
}

async function disconnectCurrentWallet() {
  if (walletLoading.value) return;
  cancelPendingWalletConnectApproval();
  walletLoading.value = true;
  try {
    await disconnectWallet();
    const walletService = await loadWalletService();
    walletService.disconnect();
    localStorage.removeItem("walletProvider");
    clearChatSession();
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
    validateConnectedWalletNetwork();
  }
}

function handleNetworkChange(event) {
  currentNetwork.value = event?.detail?.env || getCurrentEnv();
  validateConnectedWalletNetwork();
}

async function validateConnectedWalletNetwork() {
  if (!connectedAccount.value) return;
  if (walletNetworkValidationPromise) return walletNetworkValidationPromise;

  walletNetworkValidationPromise = (async () => {
    try {
      const walletService = await loadWalletService();
      if (typeof walletService.ensureNetworkConsistency === "function") {
        await walletService.ensureNetworkConsistency();
      }
    } catch (err) {
      toast.error(err?.message || t("wallet.errors.networkMismatchSwitch", { env: getCurrentEnv() }));
    } finally {
      walletNetworkValidationPromise = null;
    }
  })();

  return walletNetworkValidationPromise;
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

async function loadPrices() {
  const data = await fetchPrices();
  neoPrice.value = data.neo;
  gasPrice.value = data.gas;
  neoPriceChange.value = data.neoChange;
  gasPriceChange.value = data.gasChange;
  priceUnavailable.value = Boolean(data.pricingUnavailable);
}

async function bootstrapChatSession() {
  // Chat sessions require a connected wallet to be meaningful — every
  // chat action signs against the connected address. Skip the
  // GET /api/chat/session round-trip on page mount when no wallet is
  // present (the common case). The session restore still fires on
  // wallet connect via the connectedAccount watcher below.
  if (!connectedAccount.value) return;
  try {
    await restoreChatSession();
    if (chatSession.value) {
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
  window.addEventListener("focus", refreshOpenWalletModalAvailability);
  window.addEventListener("NEOLine.NEO.EVENT.READY", refreshOpenWalletModalAvailability);
  window.addEventListener("NEOLine.N3.EVENT.READY", refreshOpenWalletModalAvailability);
  window.addEventListener("ethereum#initialized", refreshOpenWalletModalAvailability);
  document.addEventListener("visibilitychange", handleDocumentVisibilityChange);
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
  window.removeEventListener("focus", refreshOpenWalletModalAvailability);
  window.removeEventListener("NEOLine.NEO.EVENT.READY", refreshOpenWalletModalAvailability);
  window.removeEventListener("NEOLine.N3.EVENT.READY", refreshOpenWalletModalAvailability);
  window.removeEventListener("ethereum#initialized", refreshOpenWalletModalAvailability);
  document.removeEventListener("visibilitychange", handleDocumentVisibilityChange);
  document.removeEventListener("click", handleClickOutside);
  if (dropdownTimeout) clearTimeout(dropdownTimeout);
});
</script>

<style>
.mobile-link {
  @apply rounded-lg border px-2 py-2 text-center text-sm font-semibold no-underline transition;
  background: var(--surface-elevated);
  border-color: var(--line-soft);
  color: var(--text-high);
}

.mobile-link:hover {
  background: var(--surface-hover);
  border-color: var(--line-hover);
  color: var(--link-hover);
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
  letter-spacing: 0;
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
