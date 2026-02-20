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
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-neo-green to-[#00b377] text-xs font-extrabold text-gray-900 shadow-[0_0_15px_rgba(0,229,153,0.3)] transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_25px_rgba(0,229,153,0.5)]"
          >
            N3
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

        <!-- Mobile Hamburger -->
        <MobileMenu :open="mobileMenuOpen" @toggle="mobileMenuOpen = !mobileMenuOpen" class="ml-auto lg:hidden" />
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
          <div class="grid grid-cols-2 gap-3 text-sm">
            <router-link to="/homepage" class="mobile-link" @click="closeMobile">Home</router-link>
            <router-link to="/blocks/1" class="mobile-link" @click="closeMobile">Blocks</router-link>
            <router-link to="/transactions/1" class="mobile-link" @click="closeMobile">Transactions</router-link>
            <router-link to="/tokens/nep17/1" class="mobile-link" @click="closeMobile">Tokens</router-link>
            <router-link to="/contracts/1" class="mobile-link" @click="closeMobile">Contracts</router-link>
            <router-link to="/account/1" class="mobile-link" @click="closeMobile">Accounts</router-link>
            <router-link to="/candidates/1" class="mobile-link" @click="closeMobile">Consensus</router-link>
            <router-link to="/echarts" class="mobile-link" @click="closeMobile">Charts</router-link>
            <router-link to="/burn" class="mobile-link" @click="closeMobile">Burned GAS</router-link>
            <router-link to="/gas-tracker" class="mobile-link" @click="closeMobile">Gas Tracker</router-link>
            <router-link to="/api-docs" class="mobile-link" @click="closeMobile">API Docs</router-link>
            <router-link to="/verify-contract/" class="mobile-link" @click="closeMobile">Verify Contract</router-link>
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
import { DROPDOWN_CLOSE_DELAY_MS } from "@/constants";
import { NETWORK_OPTIONS, getCurrentEnv, getNetworkLabel, setCurrentEnv } from "@/utils/env";

const NETWORK_FEE_RATIO = 0.08;

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

const currentNetworkLabel = computed(() => getNetworkLabel(currentNetwork.value));

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
    const result = await searchService.search(query);
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

function calculateNetworkFee(gasPrice) {
  return Number(Math.max(0, (gasPrice || 0) * NETWORK_FEE_RATIO).toFixed(3));
}

async function loadPrices() {
  const data = await fetchPrices();
  neoPrice.value = data.neo;
  gasPrice.value = data.gas;
  neoPriceChange.value = data.neoChange;
  gasPriceChange.value = data.gasChange;
  networkFee.value = calculateNetworkFee(data.gas);
}

onMounted(async () => {
  currentNetwork.value = getCurrentEnv();

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
