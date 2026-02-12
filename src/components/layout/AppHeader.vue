<template>
  <header class="app-header sticky top-0 z-50">
    <!-- Utility Bar -->
    <section class="utility-bar border-b border-gray-200 dark:border-gray-800">
      <div class="mx-auto flex h-8 max-w-[1400px] items-center justify-between px-4 text-xs">
        <div class="flex items-center gap-3 text-text-secondary dark:text-gray-400">
          <span>NEO:</span>
          <span class="font-medium text-text-primary dark:text-gray-100">${{ formatPrice(neoPrice) }}</span>
          <span :class="priceChangeClass(neoPriceChange)">({{ formatPriceChange(neoPriceChange) }})</span>
          <span class="hidden text-gray-300 dark:text-gray-600 sm:inline">|</span>
          <span class="hidden sm:inline">GAS:</span>
          <span class="hidden font-medium text-text-primary dark:text-gray-100 sm:inline"
            >${{ formatPrice(gasPrice) }}</span
          >
          <span class="hidden text-gray-300 dark:text-gray-600 md:inline">|</span>
          <span class="hidden md:inline">Net Fee:</span>
          <span class="hidden font-medium text-text-primary dark:text-gray-100 md:inline"
            >{{ formatGasValue(networkFee) }} GAS</span
          >
        </div>
        <div class="flex items-center gap-2">
          <div ref="networkDropdown" class="relative">
            <button
              class="h-6 rounded border border-gray-200 bg-white px-2 text-xs text-text-secondary transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              aria-label="Select network"
              @click="networkDropdownOpen = !networkDropdownOpen"
            >
              {{ currentNetworkLabel }}
            </button>
            <div
              v-show="networkDropdownOpen"
              class="absolute right-0 mt-1 w-36 rounded border border-gray-200 bg-white p-1 shadow-dropdown dark:border-gray-700 dark:bg-gray-800"
            >
              <button
                v-for="net in NETWORKS"
                :key="net.id"
                :class="[
                  'block w-full rounded px-2 py-1.5 text-left text-xs transition-colors',
                  net.id === currentNetwork
                    ? 'bg-gray-100 text-primary-600 dark:bg-gray-700 dark:text-primary-300'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700',
                ]"
                :aria-label="`Switch to ${net.name}`"
                @click="selectNetwork(net)"
              >
                {{ net.name }}
              </button>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </section>

    <!-- Main Nav Bar -->
    <nav class="main-nav bg-header-bg backdrop-blur-sm dark:bg-header-bg-dark">
      <div class="mx-auto flex h-[60px] max-w-[1400px] items-center px-4">
        <!-- Logo -->
        <router-link to="/homepage" class="mr-8 flex items-center gap-2 no-underline">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-neo-green text-sm font-bold text-gray-900">
            N3
          </div>
          <span class="text-lg font-bold text-white">Neo Explorer</span>
        </router-link>

        <!-- Desktop Nav -->
        <ul class="hidden items-center gap-0.5 lg:flex">
          <li>
            <router-link to="/homepage" class="nav-link" active-class="nav-link-active">Home</router-link>
          </li>
          <li class="nav-dropdown" @mouseenter="openDropdown('blockchain')" @mouseleave="closeDropdown('blockchain')">
            <button class="nav-link" aria-label="Blockchain menu">
              Blockchain
              <svg class="ml-0.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
            <div v-show="activeDropdown === 'blockchain'" class="dropdown-panel">
              <router-link to="/blocks/1" class="dropdown-link">Blocks</router-link>
              <router-link to="/transactions/1" class="dropdown-link">Transactions</router-link>
              <router-link to="/account/1" class="dropdown-link">Accounts</router-link>
              <router-link to="/candidates/1" class="dropdown-link">Consensus Nodes</router-link>
            </div>
          </li>
          <li class="nav-dropdown" @mouseenter="openDropdown('tokens')" @mouseleave="closeDropdown('tokens')">
            <button class="nav-link" aria-label="Tokens menu">
              Tokens
              <svg class="ml-0.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
            <div v-show="activeDropdown === 'tokens'" class="dropdown-panel">
              <router-link to="/tokens/nep17/1" class="dropdown-link">NEP-17 Tokens</router-link>
              <router-link to="/tokens/nep11/1" class="dropdown-link">NEP-11 NFTs</router-link>
            </div>
          </li>
          <li>
            <router-link to="/contracts/1" class="nav-link" active-class="nav-link-active">Contracts</router-link>
          </li>
          <li class="nav-dropdown" @mouseenter="openDropdown('resources')" @mouseleave="closeDropdown('resources')">
            <button class="nav-link" aria-label="Resources menu">
              Resources
              <svg class="ml-0.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
            <div v-show="activeDropdown === 'resources'" class="dropdown-panel">
              <router-link to="/echarts" class="dropdown-link">Charts &amp; Stats</router-link>
              <router-link to="/gas-tracker" class="dropdown-link">Gas Tracker</router-link>
              <router-link to="/burn" class="dropdown-link">Burned GAS</router-link>
            </div>
          </li>
          <li class="nav-dropdown" @mouseenter="openDropdown('developers')" @mouseleave="closeDropdown('developers')">
            <button class="nav-link" aria-label="Developers menu">
              Developers
              <svg class="ml-0.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
            <div v-show="activeDropdown === 'developers'" class="dropdown-panel">
              <router-link to="/api-docs" class="dropdown-link">API Docs</router-link>
              <router-link to="/verify-contract/" class="dropdown-link">Verify Contract</router-link>
              <router-link to="/source-code" class="dropdown-link">Source Code</router-link>
            </div>
          </li>
        </ul>

        <!-- Header Search (compact mode) -->
        <div class="ml-auto hidden w-full max-w-sm items-center md:flex lg:ml-8">
          <SearchBox mode="compact" @search="handleSearch" />
        </div>

        <!-- Mobile Hamburger -->
        <button
          class="ml-3 rounded p-2 text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 lg:hidden"
          @click="mobileMenuOpen = !mobileMenuOpen"
          aria-label="Toggle menu"
        >
          <svg v-if="!mobileMenuOpen" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Mobile Slide-out Menu -->
      <transition name="slide">
        <div
          v-show="mobileMenuOpen"
          class="border-t border-white/10 bg-header-bg px-4 py-3 dark:bg-header-bg-dark lg:hidden"
        >
          <div class="mb-3">
            <SearchBox mode="compact" @search="handleMobileSearch" />
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm">
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
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import ThemeToggle from "@/components/common/ThemeToggle.vue";
import SearchBox from "@/components/common/SearchBox.vue";
import { usePriceCache } from "@/composables/usePriceCache";
import { resolveSearchLocation } from "@/utils/searchRouting";
import { formatPrice, formatPriceChange, priceChangeClass } from "@/utils/explorerFormat";
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
const networkDropdown = ref(null);
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
  if (networkDropdown.value && !networkDropdown.value.contains(e.target)) {
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
    if (location) router.push(location);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("Search failed, falling back to default routing:", err);
    const location = resolveSearchLocation(query, null);
    if (location) router.push(location);
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

function formatGasValue(value) {
  return Number(value || 0).toFixed(3);
}

onMounted(async () => {
  currentNetwork.value = getCurrentEnv();

  try {
    await loadPrices();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("Failed to load prices:", err);
  }
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
  if (dropdownTimeout) clearTimeout(dropdownTimeout);
});
</script>

<style scoped>
.utility-bar {
  @apply bg-gray-50 dark:bg-gray-900;
}

.nav-link {
  @apply inline-flex items-center rounded px-3 py-2 text-sm font-medium text-white/80
         transition-colors hover:text-white;
}

.nav-link-active {
  @apply text-white;
}

.nav-dropdown {
  @apply relative;
}

.dropdown-panel {
  @apply absolute left-0 top-full z-50 mt-1 w-52 rounded border border-gray-200
         bg-white p-1.5 shadow-dropdown dark:border-gray-700 dark:bg-gray-800;
}

.dropdown-link {
  @apply block rounded px-3 py-2 text-sm text-gray-700 no-underline
         transition-colors hover:bg-gray-50 hover:text-primary-500
         dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-primary-400;
}

.mobile-link {
  @apply rounded border border-white/20 px-2 py-2 text-center text-white/80
         no-underline transition-colors hover:bg-white/10 hover:text-white;
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
