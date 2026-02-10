<template>
  <header class="app-header sticky top-0 z-50">
    <!-- Utility Bar -->
    <section class="utility-bar border-b border-gray-200 dark:border-gray-800">
      <div class="mx-auto flex h-8 max-w-[1400px] items-center justify-between px-4 text-xs">
        <div class="flex items-center gap-3 text-text-secondary">
          <span>NEO Price:</span>
          <span class="font-medium text-text-primary dark:text-gray-100">${{ formatPrice(neoPrice) }}</span>
          <span :class="priceChangeClass(neoPriceChange)">({{ formatPriceChange(neoPriceChange) }})</span>
          <span class="hidden text-gray-300 dark:text-gray-600 sm:inline">|</span>
          <span class="hidden sm:inline">GAS:</span>
          <span class="hidden font-medium text-text-primary dark:text-gray-100 sm:inline"
            >${{ formatPrice(gasPrice) }}</span
          >
          <span class="hidden text-gray-300 dark:text-gray-600 sm:inline">|</span>
          <span class="hidden sm:inline">Net Fee:</span>
          <span class="hidden font-medium text-text-primary dark:text-gray-100 sm:inline"
            >{{ formatGas(networkFee) }} GAS</span
          >
        </div>

        <div class="flex items-center gap-2">
          <div class="relative" ref="networkDropdown">
            <button
              class="h-6 rounded border border-gray-200 bg-white px-2 text-xs text-text-secondary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              @click="networkDropdownOpen = !networkDropdownOpen"
            >
              {{ currentNetworkLabel }}
            </button>
            <div
              v-show="networkDropdownOpen"
              class="absolute right-0 mt-1 w-36 rounded border border-gray-200 bg-white p-1 shadow-dropdown dark:border-gray-700 dark:bg-gray-800"
            >
              <button
                v-for="net in networks"
                :key="net.id"
                class="block w-full rounded px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
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
    <nav class="main-nav bg-header-bg dark:bg-header-bg-dark">
      <div class="mx-auto flex h-[60px] max-w-[1400px] items-center px-4">
        <!-- Logo -->
        <router-link to="/homepage" class="mr-8 flex items-center gap-2 no-underline">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-neo-green text-sm font-bold text-gray-900">
            N3
          </div>
          <span class="text-lg font-bold text-white">NeoScan</span>
        </router-link>

        <!-- Desktop Nav -->
        <ul class="hidden items-center gap-0.5 lg:flex">
          <li>
            <router-link to="/homepage" class="nav-link" active-class="nav-link-active">Home</router-link>
          </li>

          <li class="nav-dropdown" @mouseenter="openDropdown('blockchain')" @mouseleave="closeDropdown('blockchain')">
            <button class="nav-link">
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
            <button class="nav-link">
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
            <button class="nav-link">
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
              <router-link to="/echarts" class="dropdown-link">Charts</router-link>
              <router-link to="/burn" class="dropdown-link">Burned Gas</router-link>
              <router-link to="/candidates/1" class="dropdown-link">Consensus Nodes</router-link>
            </div>
          </li>

          <li class="nav-dropdown" @mouseenter="openDropdown('developers')" @mouseleave="closeDropdown('developers')">
            <button class="nav-link">
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
              <router-link to="/contracts/1" class="dropdown-link">Contract Search</router-link>
            </div>
          </li>

          <li class="nav-dropdown" @mouseenter="openDropdown('more')" @mouseleave="closeDropdown('more')">
            <button class="nav-link">
              More
              <svg class="ml-0.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
            <div v-show="activeDropdown === 'more'" class="mega-menu-panel">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Tools</p>
                  <span class="dropdown-link cursor-default opacity-60">Unit Converter (Soon)</span>
                  <span class="dropdown-link cursor-default opacity-60">CSV Export (Soon)</span>
                </div>
                <div>
                  <p class="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Explore</p>
                  <router-link to="/gas-tracker" class="dropdown-link">Gas Tracker</router-link>
                  <router-link to="/echarts" class="dropdown-link">Charts &amp; Stats</router-link>
                </div>
              </div>
            </div>
          </li>
        </ul>

        <!-- Search Bar -->
        <div class="ml-auto hidden w-full max-w-md items-center md:flex lg:ml-8">
          <form class="relative w-full" @submit.prevent="handleSearch">
            <input
              v-model="searchQuery"
              type="text"
              class="h-[38px] w-full rounded border border-white/20 bg-white/10 pl-3 pr-20 text-sm text-white placeholder-white/50 outline-none transition-all focus:border-white/40 focus:bg-white/15"
              placeholder="Search by Address / Txn Hash / Block"
            />
            <div class="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <kbd
                class="hidden rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-white/50 lg:inline-block"
                >/</kbd
              >
              <button
                type="submit"
                class="rounded bg-primary-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-primary-600"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </div>
          </form>
        </div>

        <!-- Mobile Hamburger -->
        <button
          class="ml-3 rounded p-2 text-white/70 hover:text-white lg:hidden"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <svg
            v-if="!mobileMenuOpen"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            class="h-5 w-5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            class="h-5 w-5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Mobile Menu -->
      <div
        v-show="mobileMenuOpen"
        class="border-t border-white/10 bg-header-bg px-4 py-3 dark:bg-header-bg-dark lg:hidden"
      >
        <form class="mb-3" @submit.prevent="handleSearch">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search..."
            class="h-9 w-full rounded border border-white/20 bg-white/10 px-3 text-sm text-white placeholder-white/50 outline-none focus:border-white/40"
          />
        </form>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <router-link to="/homepage" class="mobile-link" @click="closeMobile">Home</router-link>
          <router-link to="/blocks/1" class="mobile-link" @click="closeMobile">Blocks</router-link>
          <router-link to="/transactions/1" class="mobile-link" @click="closeMobile">Transactions</router-link>
          <router-link to="/tokens/nep17/1" class="mobile-link" @click="closeMobile">Tokens</router-link>
          <router-link to="/contracts/1" class="mobile-link" @click="closeMobile">Contracts</router-link>
          <router-link to="/account/1" class="mobile-link" @click="closeMobile">Accounts</router-link>
          <router-link to="/candidates/1" class="mobile-link" @click="closeMobile">Consensus</router-link>
          <router-link to="/echarts" class="mobile-link" @click="closeMobile">Charts</router-link>
          <router-link to="/burn" class="mobile-link" @click="closeMobile">Burned Gas</router-link>
          <router-link to="/api-docs" class="mobile-link" @click="closeMobile">API Docs</router-link>
          <router-link to="/verify-contract/" class="mobile-link" @click="closeMobile">Verify Contract</router-link>
          <router-link to="/gas-tracker" class="mobile-link" @click="closeMobile">Gas Tracker</router-link>
        </div>
      </div>
    </nav>
  </header>
</template>

<script>
import ThemeToggle from "@/components/common/ThemeToggle.vue";
import { searchService } from "@/services";
import { usePriceCache } from "@/composables/usePriceCache";
import { resolveSearchLocation } from "@/utils/searchRouting";

export default {
  name: "AppHeader",
  components: { ThemeToggle },

  setup() {
    const { prices, fetchPrices } = usePriceCache();
    return { priceCache: prices, fetchPrices };
  },

  data() {
    return {
      mobileMenuOpen: false,
      networkDropdownOpen: false,
      activeDropdown: null,
      dropdownTimeout: null,
      searchQuery: "",
      currentNetwork: "Mainnet",
      networks: [
        { id: "Mainnet", name: "N3 Mainnet" },
        { id: "Testnet", name: "N3 Testnet" },
      ],
      neoPrice: 12.5,
      gasPrice: 4.2,
      neoPriceChange: 0,
      gasPriceChange: 0,
      networkFee: 0.349,
    };
  },

  computed: {
    currentNetworkLabel() {
      return this.currentNetwork === "Mainnet" ? "Mainnet" : "Testnet";
    },
  },

  async mounted() {
    await this.loadPrices();
    document.addEventListener("click", this.handleClickOutside);
    document.addEventListener("keydown", this.handleGlobalKeydown);
  },

  beforeUnmount() {
    document.removeEventListener("click", this.handleClickOutside);
    document.removeEventListener("keydown", this.handleGlobalKeydown);
    if (this.dropdownTimeout) {
      clearTimeout(this.dropdownTimeout);
    }
  },

  methods: {
    openDropdown(name) {
      if (this.dropdownTimeout) {
        clearTimeout(this.dropdownTimeout);
      }
      this.activeDropdown = name;
    },

    closeDropdown(name) {
      this.dropdownTimeout = setTimeout(() => {
        if (this.activeDropdown === name) {
          this.activeDropdown = null;
        }
      }, 120);
    },

    closeMobile() {
      this.mobileMenuOpen = false;
    },

    handleClickOutside(e) {
      if (this.$refs.networkDropdown && !this.$refs.networkDropdown.contains(e.target)) {
        this.networkDropdownOpen = false;
      }
    },

    selectNetwork(net) {
      this.currentNetwork = net.id;
      this.networkDropdownOpen = false;
    },

    handleGlobalKeydown(e) {
      if (e.key === "/" && !this.isInputFocused()) {
        e.preventDefault();
        const input = this.$el.querySelector(".main-nav input[type='text']");
        if (input) input.focus();
      }
    },

    isInputFocused() {
      const tag = document.activeElement?.tagName?.toLowerCase();
      return tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable;
    },

    async handleSearch() {
      const query = this.searchQuery.trim();
      if (!query) return;

      try {
        const result = await searchService.search(query);
        const location = resolveSearchLocation(query, result);
        if (location) {
          this.$router.push(location);
        }
      } catch (error) {
        const location = resolveSearchLocation(query, null);
        if (location) {
          this.$router.push(location);
        }
      }

      this.searchQuery = "";
      this.mobileMenuOpen = false;
    },

    async loadPrices() {
      const data = await this.fetchPrices();
      this.neoPrice = data.neo;
      this.gasPrice = data.gas;
      this.neoPriceChange = data.neoChange;
      this.gasPriceChange = data.gasChange;

      // For etherscan-style top utility bar this is shown as “Gas”.
      // We map to a reasonable derived gwei-like display value.
      this.networkFee = Number(Math.max(0, (data.gas || 0) * 0.08).toFixed(3));
    },

    formatPrice(value) {
      const n = Number(value || 0);
      return n.toFixed(2);
    },

    formatGas(value) {
      const n = Number(value || 0);
      return n.toFixed(3);
    },

    formatPriceChange(change) {
      const value = Number(change || 0);
      const sign = value >= 0 ? "+" : "";
      return `${sign}${value.toFixed(2)}%`;
    },

    priceChangeClass(change) {
      return Number(change || 0) >= 0 ? "text-green-600" : "text-red-600";
    },
  },
};
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

.mega-menu-panel {
  @apply absolute left-0 top-full z-50 mt-1 w-80 rounded border border-gray-200
         bg-white p-4 shadow-dropdown dark:border-gray-700 dark:bg-gray-800;
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
</style>
