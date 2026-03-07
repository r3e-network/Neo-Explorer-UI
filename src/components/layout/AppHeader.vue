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
          {{ walletLoading ? "Connecting..." : walletButtonLabel }}
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
            {{ walletLoading ? "Connecting wallet..." : mobilePanelWalletLabel }}
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
            <router-link to="/nns" class="mobile-link" @click="closeMobile">NNS Domains (.neo)</router-link>
            <router-link to="/matrix" class="mobile-link" @click="closeMobile">Matrix Domain (.matrix)</router-link>
            <router-link to="/echarts" class="mobile-link" @click="closeMobile">{{ $t("nav.chartsStats") }}</router-link>
            <router-link to="/burn" class="mobile-link" @click="closeMobile">{{ $t("nav.burnedGas") }}</router-link>
            <router-link to="/gas-tracker" class="mobile-link" @click="closeMobile">{{ $t("nav.gasTracker") }}</router-link>
            <router-link to="/api-docs" class="mobile-link" @click="closeMobile">{{ $t("nav.apiDocs") }}</router-link>
            <router-link to="/verify-contract/" class="mobile-link" @click="closeMobile">{{ $t("nav.verifyContract") }}</router-link>
          </div>
        </div>
      </transition>
    </nav>
  
    <transition name="fade">
      <div v-if="showWalletModal" class="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div class="bg-surface w-full max-w-sm rounded-2xl shadow-2xl border border-line-soft overflow-hidden relative" @click.stop>
          <div class="px-6 py-4 border-b border-line-soft flex items-center justify-between">
            <h2 class="text-lg font-bold text-high">Connect Wallet</h2>
            <button @click="showWalletModal = false" class="text-low hover:text-high transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          <div class="p-6 space-y-3">
            <button 
              v-for="provider in supportedProviders" 
              :key="provider"
              :disabled="walletLoading"
              :title="isProviderAvailable(provider) ? provider : getProviderUnavailableReason(provider)"
              @click="handleConnect(provider)"
              class="w-full flex items-center justify-between p-4 rounded-xl border border-line-soft bg-surface-muted hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all group disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center border border-line-soft p-2">
                  <img v-if="provider === 'NeoLine'" :src="'/img/brand/neoline.svg'" alt="NeoLine" class="w-full h-full object-contain" onerror="this.src='/img/brand/neo.png'" />
                  <img v-else-if="provider === 'O3'" :src="'/img/brand/o3.png'" alt="O3" class="w-full h-full object-contain" onerror="this.src='/img/brand/neo.png'" />
                  <img v-else-if="provider === 'WalletConnect'" :src="'/img/brand/walletconnect.ico'" alt="WalletConnect" class="w-full h-full object-contain" onerror="this.src='/img/brand/neo.png'" />
                  <img v-else-if="provider === 'Neon Wallet'" :src="'/img/brand/neon.ico'" alt="Neon Wallet" class="w-full h-full object-contain" />
                  <img v-else-if="provider === 'OneGate'" :src="'/img/brand/onegate.ico'" alt="OneGate" class="w-full h-full object-contain" />
                  <img v-else-if="provider === 'Google / Email (Web3Auth)'" :src="'/img/brand/web3auth.png'" alt="Web3Auth" class="w-full h-full object-contain" onerror="this.src='/img/brand/neo.png'" />
                  <img v-else-if="provider === 'EVM Wallets (MetaMask, OKX, Rabby, etc.)'" src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" class="w-full h-full object-contain" />
                  <svg v-else class="w-6 h-6 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 15.92 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>
                </div>
                <span class="font-semibold text-high group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{{ provider }}</span>
              </div>
              <svg class="w-5 h-5 text-low group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
          </div>
        </div>
      </div>
    </transition>
    
    <WalletConnectModal v-if="wcUri" :uri="wcUri" :visible="!!wcUri" @close="wcUri = ''" />

  </header>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, onActivated, onDeactivated } from "vue";
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
import WalletConnectModal from "@/views/Contract/components/WalletConnectModal.vue";
import { walletService } from "@/services/walletService";
import { useToast } from "vue-toastification";


const router = useRouter();
const { fetchPrices } = usePriceCache();
const toast = useToast();

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

const currentNetworkLabel = computed(() => getNetworkLabel(currentNetwork.value));
const walletButtonLabel = computed(() => {
  if (!connectedAccount.value) return "Connect Wallet";
  return `${connectedAccount.value.slice(0, 6)}...${connectedAccount.value.slice(-4)}`;
});
const mobileWalletLabel = computed(() => (connectedAccount.value ? "Disconnect" : "Connect"));
const mobilePanelWalletLabel = computed(() =>
  connectedAccount.value
    ? `Disconnect ${connectedAccount.value.slice(0, 6)}...${connectedAccount.value.slice(-4)}`
    : "Connect Wallet"
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

function isProviderAvailable(provider) {
  return availableProviders.value.includes(provider);
}

function getProviderUnavailableReason(provider) {
  if (provider === walletService.PROVIDERS.WALLETCONNECT) {
    return "Open WalletConnect website to learn how to pair a supported wallet";
  }
  if (provider === walletService.PROVIDERS.NEON) {
    return "Open Neon Wallet download page";
  }
  if (provider === walletService.PROVIDERS.ONEGATE) {
    return "Open OneGate install page";
  }
  if (provider === walletService.PROVIDERS.O3) {
    return "Open O3 download page";
  }
  if (provider === walletService.PROVIDERS.NEOLINE) {
    return "Open NeoLine install page";
  }
  if (provider === walletService.PROVIDERS.EVM_WALLET) {
    return "Open MetaMask install page";
  }
  return "Wallet is currently unavailable";
}

function getProviderInstallUrl(provider) {
  if (provider === walletService.PROVIDERS.NEOLINE) {
    return "https://neoline.io/en/";
  }
  if (provider === walletService.PROVIDERS.O3) {
    return "https://www.o3.network/";
  }
  if (provider === walletService.PROVIDERS.ONEGATE) {
    return "https://onegate.space/";
  }
  if (provider === walletService.PROVIDERS.WALLETCONNECT) {
    return "https://walletconnect.network/";
  }
  if (provider === walletService.PROVIDERS.NEON) {
    return "https://neon.coz.io/";
  }
  if (provider === walletService.PROVIDERS.EVM_WALLET) {
    return "https://metamask.io/download/";
  }
  return "";
}

async function handleConnect(provider) {
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
          toast.success(`Connected: ${account.address.slice(0, 6)}...${account.address.slice(-4)}`);
        } catch(e) {
          wcUri.value = "";
          toast.error(e?.message || "WalletConnect connection was not approved.");
        }
        return;
     }
     
     if (result && result.address) {
       connectedAccount.value = result.address;
       localStorage.setItem("connectedWallet", result.address);
       localStorage.setItem("walletProvider", provider);
       toast.success(`Connected: ${result.address.slice(0, 6)}...${result.address.slice(-4)}`);
     }
  } catch (err) {
     let errMsg = err?.message;
     if (!errMsg && err?.description) errMsg = err.description;
     if (!errMsg && err?.error?.message) errMsg = err.error.message;
     toast.error(errMsg || "Failed to connect wallet.");
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
      walletService.disconnect();
      localStorage.removeItem("walletProvider");
      return;
    }
    availableProviders.value = walletService.getAvailableProviders();
    supportedProviders.value = typeof walletService.getSupportedProviders === "function"
      ? walletService.getSupportedProviders()
      : walletService.getAvailableProviders();
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

onMounted(async () => {
  currentNetwork.value = getCurrentEnv();

  // Initialize wallet state
  initWallet();

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
</style>
