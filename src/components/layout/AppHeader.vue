<template>
  <header class="app-header sticky top-0 z-50">
    <!-- Top Bar - Price Info -->
    <div
      class="top-bar bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-between h-8 text-xs">
          <div class="flex items-center gap-4">
            <!-- NEO Price -->
            <div class="flex items-center gap-1.5">
              <span class="text-gray-500 dark:text-gray-400">NEO:</span>
              <span class="font-medium text-gray-700 dark:text-gray-200"
                >${{ neoPrice }}</span
              >
              <span :class="priceChangeClass(neoPriceChange)">
                ({{ formatPriceChange(neoPriceChange) }})
              </span>
            </div>
            <!-- GAS Price -->
            <div class="flex items-center gap-1.5">
              <span class="text-gray-500 dark:text-gray-400">GAS:</span>
              <span class="font-medium text-gray-700 dark:text-gray-200"
                >${{ gasPrice }}</span
              >
              <span :class="priceChangeClass(gasPriceChange)">
                ({{ formatPriceChange(gasPriceChange) }})
              </span>
            </div>
            <!-- Network Fee -->
            <div class="hidden md:flex items-center gap-1.5">
              <svg
                class="w-3 h-3 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
              </svg>
              <span class="text-gray-500 dark:text-gray-400">Network Fee:</span>
              <span class="font-medium text-gray-700 dark:text-gray-200"
                >{{ networkFee }} GAS</span
              >
            </div>
          </div>
          <div class="flex items-center gap-3">
            <ThemeToggle size="sm" />
            <!-- Network Selector -->
            <div class="relative" ref="networkDropdown">
              <button
                @click="networkDropdownOpen = !networkDropdownOpen"
                class="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <span class="w-2 h-2 rounded-full bg-green-500"></span>
                <span class="text-gray-600 dark:text-gray-300">{{
                  currentNetwork
                }}</span>
                <svg
                  class="w-3 h-3 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <div
                v-show="networkDropdownOpen"
                class="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-dropdown border border-gray-200 dark:border-gray-700 py-1 z-50"
              >
                <button
                  v-for="net in networks"
                  :key="net.id"
                  @click="selectNetwork(net)"
                  class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <span
                    class="w-2 h-2 rounded-full"
                    :class="
                      net.id === currentNetwork ? 'bg-green-500' : 'bg-gray-300'
                    "
                  ></span>
                  {{ net.name }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Navigation -->
    <nav
      class="main-nav bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-between h-14">
          <!-- Logo -->
          <router-link to="/" class="flex items-center gap-2 flex-shrink-0">
            <div
              class="w-8 h-8 bg-gradient-to-br from-neo-green to-primary-500 rounded-lg flex items-center justify-center"
            >
              <span class="text-white font-bold text-sm">N3</span>
            </div>
            <div class="hidden sm:block">
              <span class="font-bold text-gray-800 dark:text-white text-lg"
                >NeoScan</span
              >
              <span class="text-xs text-gray-400 ml-1">N3</span>
            </div>
          </router-link>

          <!-- Desktop Navigation -->
          <div class="hidden lg:flex items-center gap-1">
            <!-- Home -->
            <router-link to="/" class="nav-item">Home</router-link>

            <!-- Blockchain Dropdown -->
            <div
              class="relative"
              @mouseenter="openDropdown('blockchain')"
              @mouseleave="closeDropdown('blockchain')"
            >
              <button class="nav-item flex items-center gap-1">
                Blockchain
                <svg
                  class="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <div
                v-show="activeDropdown === 'blockchain'"
                class="dropdown-menu"
              >
                <router-link to="/blocks/1" class="dropdown-item">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2L3 7v6l7 5 7-5V7l-7-5z" />
                  </svg>
                  <div>
                    <div class="font-medium">Blocks</div>
                    <div class="text-xs text-gray-400">View all blocks</div>
                  </div>
                </router-link>
                <router-link to="/Transactions/1" class="dropdown-item">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4z"
                    />
                  </svg>
                  <div>
                    <div class="font-medium">Transactions</div>
                    <div class="text-xs text-gray-400">
                      View all transactions
                    </div>
                  </div>
                </router-link>
                <div class="dropdown-divider"></div>
                <router-link to="/account/1" class="dropdown-item">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <div>
                    <div class="font-medium">Top Accounts</div>
                    <div class="text-xs text-gray-400">Ranked by balance</div>
                  </div>
                </router-link>
                <router-link to="/candidates" class="dropdown-item">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"
                    />
                  </svg>
                  <div>
                    <div class="font-medium">Consensus Nodes</div>
                    <div class="text-xs text-gray-400">Network validators</div>
                  </div>
                </router-link>
              </div>
            </div>

            <!-- Tokens Dropdown -->
            <div
              class="relative"
              @mouseenter="openDropdown('tokens')"
              @mouseleave="closeDropdown('tokens')"
            >
              <button class="nav-item flex items-center gap-1">
                Tokens
                <svg
                  class="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <div v-show="activeDropdown === 'tokens'" class="dropdown-menu">
                <router-link to="/tokens/nep17/1" class="dropdown-item">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6c.304 0 .792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95c-.285.475-.507 1-.67 1.55H6a1 1 0 000 2h.013a9.358 9.358 0 000 1H6a1 1 0 100 2h.351c.163.55.385 1.075.67 1.55C7.721 15.216 8.768 16 10 16s2.279-.784 2.979-1.95a1 1 0 10-1.715-1.029c-.472.786-.96.979-1.264.979-.304 0-.792-.193-1.264-.979a4.265 4.265 0 01-.264-.521H10a1 1 0 100-2H8.017a7.36 7.36 0 010-1H10a1 1 0 100-2H8.472c.08-.185.167-.36.264-.521z"
                    />
                  </svg>
                  <div>
                    <div class="font-medium">NEP-17 Tokens</div>
                    <div class="text-xs text-gray-400">Fungible tokens</div>
                  </div>
                </router-link>
                <router-link to="/tokens/nep11/1" class="dropdown-item">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <div>
                    <div class="font-medium">NEP-11 NFTs</div>
                    <div class="text-xs text-gray-400">Non-fungible tokens</div>
                  </div>
                </router-link>
                <div class="dropdown-divider"></div>
                <router-link to="/tokens/nep17/neo" class="dropdown-item">
                  <div
                    class="w-4 h-4 rounded-full bg-neo-green/20 flex items-center justify-center"
                  >
                    <span class="text-neo-green text-xs font-bold">N</span>
                  </div>
                  <div>
                    <div class="font-medium">NEO Token</div>
                    <div class="text-xs text-gray-400">Governance token</div>
                  </div>
                </router-link>
                <router-link to="/tokens/nep17/gas" class="dropdown-item">
                  <div
                    class="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center"
                  >
                    <span class="text-green-500 text-xs font-bold">G</span>
                  </div>
                  <div>
                    <div class="font-medium">GAS Token</div>
                    <div class="text-xs text-gray-400">Utility token</div>
                  </div>
                </router-link>
              </div>
            </div>

            <!-- Contracts -->
            <router-link to="/contracts/1" class="nav-item"
              >Contracts</router-link
            >

            <!-- Resources Dropdown -->
            <div
              class="relative"
              @mouseenter="openDropdown('resources')"
              @mouseleave="closeDropdown('resources')"
            >
              <button class="nav-item flex items-center gap-1">
                Resources
                <svg
                  class="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <div
                v-show="activeDropdown === 'resources'"
                class="dropdown-menu"
              >
                <router-link to="/charts" class="dropdown-item">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"
                    />
                  </svg>
                  <div>
                    <div class="font-medium">Charts & Stats</div>
                    <div class="text-xs text-gray-400">Network analytics</div>
                  </div>
                </router-link>
                <router-link to="/burngas" class="dropdown-item">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <div>
                    <div class="font-medium">GAS Burned</div>
                    <div class="text-xs text-gray-400">Fee statistics</div>
                  </div>
                </router-link>
                <div class="dropdown-divider"></div>
                <router-link to="/api-docs" class="dropdown-item">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <div>
                    <div class="font-medium">API Documentation</div>
                    <div class="text-xs text-gray-400">Developer resources</div>
                  </div>
                </router-link>
              </div>
            </div>
          </div>

          <!-- Search Bar (Desktop) -->
          <div class="hidden md:block flex-1 max-w-md mx-4">
            <div class="relative">
              <input
                v-model="searchQuery"
                @keyup.enter="handleSearch"
                type="text"
                placeholder="Search by Address / Txn Hash / Block / Token"
                class="w-full h-9 pl-10 pr-4 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
              <svg
                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <button
                @click="handleSearch"
                class="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1 bg-primary-500 text-white text-xs rounded-md hover:bg-primary-600 transition-colors"
              >
                Search
              </button>
            </div>
          </div>

          <!-- Mobile Menu Button -->
          <button
            @click="mobileMenuOpen = !mobileMenuOpen"
            class="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg
              v-if="!mobileMenuOpen"
              class="w-6 h-6 text-gray-600 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            <svg
              v-else
              class="w-6 h-6 text-gray-600 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </nav>

    <!-- Mobile Menu -->
    <div
      v-show="mobileMenuOpen"
      class="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="container mx-auto px-4 py-4">
        <!-- Mobile Search -->
        <div class="mb-4">
          <div class="relative">
            <input
              v-model="searchQuery"
              @keyup.enter="handleSearch"
              type="text"
              placeholder="Search..."
              class="w-full h-10 pl-10 pr-4 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
            />
            <svg
              class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <!-- Mobile Nav Links -->
        <div class="space-y-1">
          <router-link
            to="/"
            class="mobile-nav-item"
            @click="mobileMenuOpen = false"
            >Home</router-link
          >
          <router-link
            to="/blocks/1"
            class="mobile-nav-item"
            @click="mobileMenuOpen = false"
            >Blocks</router-link
          >
          <router-link
            to="/Transactions/1"
            class="mobile-nav-item"
            @click="mobileMenuOpen = false"
            >Transactions</router-link
          >
          <router-link
            to="/tokens/nep17/1"
            class="mobile-nav-item"
            @click="mobileMenuOpen = false"
            >NEP-17 Tokens</router-link
          >
          <router-link
            to="/tokens/nep11/1"
            class="mobile-nav-item"
            @click="mobileMenuOpen = false"
            >NFTs</router-link
          >
          <router-link
            to="/contracts/1"
            class="mobile-nav-item"
            @click="mobileMenuOpen = false"
            >Contracts</router-link
          >
          <router-link
            to="/account/1"
            class="mobile-nav-item"
            @click="mobileMenuOpen = false"
            >Accounts</router-link
          >
          <router-link
            to="/charts"
            class="mobile-nav-item"
            @click="mobileMenuOpen = false"
            >Charts</router-link
          >
        </div>
      </div>
    </div>
  </header>
</template>

<script>
import ThemeToggle from "@/components/common/ThemeToggle.vue";
import { searchService } from "@/services";

export default {
  name: "AppHeader",
  components: { ThemeToggle },

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
      neoPrice: "12.50",
      gasPrice: "4.20",
      neoPriceChange: 2.5,
      gasPriceChange: -1.2,
      networkFee: "0.001",
    };
  },

  mounted() {
    this.loadPrices();
    document.addEventListener("click", this.handleClickOutside);
  },

  beforeUnmount() {
    document.removeEventListener("click", this.handleClickOutside);
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
      }, 150);
    },

    handleClickOutside(e) {
      if (
        this.$refs.networkDropdown &&
        !this.$refs.networkDropdown.contains(e.target)
      ) {
        this.networkDropdownOpen = false;
      }
    },

    selectNetwork(net) {
      this.currentNetwork = net.id;
      this.networkDropdownOpen = false;
    },

    async handleSearch() {
      if (!this.searchQuery.trim()) return;

      try {
        const result = await searchService.search(this.searchQuery.trim());
        if (result.type === "block") {
          this.$router.push(
            `/blockinfo/${result.data.hash || this.searchQuery}`
          );
        } else if (result.type === "transaction") {
          this.$router.push(
            `/transactionInfo/${result.data.hash || this.searchQuery}`
          );
        } else if (result.type === "contract") {
          this.$router.push(
            `/contractinfo/${result.data.hash || this.searchQuery}`
          );
        } else if (result.type === "address") {
          this.$router.push(`/accountprofile/${this.searchQuery}`);
        } else {
          this.$router.push({
            path: "/search",
            query: { q: this.searchQuery },
          });
        }
      } catch (error) {
        this.$router.push({ path: "/search", query: { q: this.searchQuery } });
      }

      this.searchQuery = "";
      this.mobileMenuOpen = false;
    },

    async loadPrices() {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=neo,gas&vs_currencies=usd&include_24hr_change=true"
        );
        const data = await response.json();
        this.neoPrice = (data.neo?.usd || 12.5).toFixed(2);
        this.gasPrice = (data.gas?.usd || 4.2).toFixed(2);
        this.neoPriceChange = data.neo?.usd_24h_change || 0;
        this.gasPriceChange = data.gas?.usd_24h_change || 0;
      } catch (error) {
        console.error("Failed to load prices:", error);
      }
    },

    formatPriceChange(change) {
      const sign = change >= 0 ? "+" : "";
      return `${sign}${change.toFixed(2)}%`;
    },

    priceChangeClass(change) {
      return change >= 0 ? "text-green-500" : "text-red-500";
    },
  },
};
</script>

<style scoped>
.nav-item {
  @apply px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 
         hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-700 
         rounded-lg transition-colors cursor-pointer;
}

.nav-item.router-link-exact-active {
  @apply text-primary-500 bg-primary-50 dark:bg-primary-900/20;
}

.dropdown-menu {
  @apply absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 
         rounded-xl shadow-dropdown border border-gray-200 dark:border-gray-700 
         py-2 z-50 animate-fade-in;
}

.dropdown-item {
  @apply flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 
         hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors;
}

.dropdown-item svg,
.dropdown-item > div:first-child {
  @apply text-gray-400 flex-shrink-0;
}

.dropdown-divider {
  @apply my-2 border-t border-gray-200 dark:border-gray-700;
}

.mobile-nav-item {
  @apply block px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 
         hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors;
}
</style>
