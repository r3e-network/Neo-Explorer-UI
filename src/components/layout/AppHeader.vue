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
          class="ml-3 hidden items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all lg:inline-flex shadow-sm active:scale-95"
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
            <router-link to="/nns" class="mobile-link" @click="closeMobile">NNS Domains</router-link>
            <router-link to="/echarts" class="mobile-link" @click="closeMobile">{{ $t("nav.chartsStats") }}</router-link>
            <router-link to="/burn" class="mobile-link" @click="closeMobile">{{ $t("nav.burnedGas") }}</router-link>
            <router-link to="/gas-tracker" class="mobile-link" @click="closeMobile">{{ $t("nav.gasTracker") }}</router-link>
            <router-link to="/api-docs" class="mobile-link" @click="closeMobile">{{ $t("nav.apiDocs") }}</router-link>
            <router-link to="/verify-contract/" class="mobile-link" @click="closeMobile">{{ $t("nav.verifyContract") }}</router-link>
          </div>
        </div>
      </transition>
    </nav>
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
import { NETWORK_OPTIONS, getCurrentEnv, getNetworkLabel, setCurrentEnv } from "@/utils/env";
import { connectedAccount, connectWallet, disconnectWallet, initWallet } from "@/utils/wallet";


const router = useRouter();
const { fetchPrices } = usePriceCache();

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

async function toggleWallet() {
  if (walletLoading.value) return;
  walletLoading.value = true;
  try {
    if (connectedAccount.value) {
      await disconnectWallet();
      return;
    }
    await connectWallet();
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
