<template>
  <div class="search-box relative" ref="searchContainer">
    <div
      class="relative flex items-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent transition-all duration-200"
    >
      <!-- Filter Dropdown -->
      <select
        v-model="activeFilter"
        class="h-full appearance-none border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 pl-3 pr-7 py-4 rounded-l-xl cursor-pointer focus:outline-none"
        aria-label="Search filter"
      >
        <option v-for="f in filters" :key="f.value" :value="f.value">{{ f.label }}</option>
      </select>
      <!-- Search Icon + Shortcut Indicator -->
      <div class="pl-3 flex-shrink-0 flex items-center gap-1.5">
        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <kbd
          v-if="!isFocused"
          class="hidden sm:inline-flex h-5 w-5 items-center justify-center rounded border border-gray-300 bg-gray-100 text-[10px] font-medium text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
          title="Press / to search"
          >/</kbd
        >
      </div>
      <!-- Input -->
      <input
        ref="searchInput"
        v-model="query"
        type="text"
        :placeholder="currentPlaceholder"
        class="search-input flex-1 px-3 py-4 pr-28 bg-transparent text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none text-base"
        @keyup.enter="handleSearch"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown.down.prevent="navigateSuggestion(1)"
        @keydown.up.prevent="navigateSuggestion(-1)"
        @keydown.escape="closeSuggestions"
        autocomplete="off"
        role="combobox"
        aria-label="Search blockchain"
        :aria-expanded="showDropdown"
        aria-controls="search-dropdown"
        aria-autocomplete="list"
        :aria-activedescendant="selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined"
      />
      <!-- Search Button -->
      <button
        @click="handleSearch"
        :disabled="loading || !query.trim()"
        class="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg font-medium text-sm transition-colors duration-200 flex items-center gap-2"
      >
        <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>Search</span>
      </button>
    </div>

    <!-- Search Dropdown -->
    <transition name="dropdown">
      <div
        v-if="showDropdown"
        id="search-dropdown"
        role="listbox"
        aria-label="Search suggestions"
        class="dropdown absolute w-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-dropdown border border-gray-100 dark:border-gray-700 overflow-hidden z-50 max-h-96 overflow-y-auto"
      >
        <!-- Search History -->
        <div v-if="!query && searchHistory.length > 0" class="history-section">
          <div class="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/50">
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Recent Searches
            </span>
            <button
              @click.stop="clearHistory"
              aria-label="Clear search history"
              class="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Clear
            </button>
          </div>
          <div
            v-for="(item, index) in searchHistory.slice(0, 5)"
            :key="'h-' + index"
            :id="`suggestion-${index}`"
            role="option"
            :aria-selected="selectedIndex === index"
            :class="[
              'history-item px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors',
              selectedIndex === index
                ? 'bg-primary-50 dark:bg-primary-900/20'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700',
            ]"
            @click="selectHistoryItem(item)"
          >
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span class="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{{ item.query }}</span>
            <span :class="getTypeBadgeClass(item.type)" class="text-xs px-2 py-0.5 rounded-full">
              {{ item.type }}
            </span>
          </div>
        </div>

        <!-- Search Suggestions -->
        <div v-if="query && suggestions.length > 0" class="suggestions-section">
          <div class="px-4 py-2 bg-gray-50 dark:bg-gray-700/50">
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Suggestions
            </span>
          </div>
          <div
            v-for="(item, index) in suggestions"
            :key="'s-' + index"
            :id="`suggestion-${index}`"
            role="option"
            :aria-selected="selectedIndex === index"
            :class="[
              'suggestion-item px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors',
              selectedIndex === index
                ? 'bg-primary-50 dark:bg-primary-900/20'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700',
            ]"
            @click="selectSuggestion(item)"
          >
            <span
              :class="getTypeIconClass(item.type)"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
            >
              {{ getTypeIcon(item.type) }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 dark:text-white truncate">
                {{ item.label }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate font-mono">
                {{ item.value }}
              </p>
            </div>
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        <!-- Quick Search Tips -->
        <div v-if="!query && searchHistory.length === 0" class="tips-section p-4">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Search Tips</p>
          <div class="space-y-2">
            <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span
                class="w-6 h-6 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-500 flex items-center justify-center text-xs"
                >Bk</span
              >
              <span>Block height: <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">12345678</code></span>
            </div>
            <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span
                class="w-6 h-6 rounded bg-green-100 dark:bg-green-900/30 text-green-500 flex items-center justify-center text-xs"
                >Tx</span
              >
              <span>Transaction hash: <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">0x...</code></span>
            </div>
            <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span
                class="w-6 h-6 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-500 flex items-center justify-center text-xs"
                >Ad</span
              >
              <span>Address: <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">N...</code></span>
            </div>
          </div>
        </div>

        <!-- No Results -->
        <div v-if="query && suggestions.length === 0 && !isSearching" class="no-results p-4 text-center">
          <svg
            class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p class="text-sm text-gray-500 dark:text-gray-400">Press Enter to search</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
const HISTORY_KEY = "neo_explorer_search_history";

export default {
  name: "SearchBox",
  props: {
    placeholder: {
      type: String,
      default: "Search by Address / Txn Hash / Block / Token / Contract",
    },
    loading: { type: Boolean, default: false },
  },
  emits: ["search"],

  data() {
    return {
      query: "",
      activeFilter: "all",
      filters: [
        { value: "all", label: "All Filters" },
        { value: "addresses", label: "Addresses" },
        { value: "transactions", label: "Transactions" },
        { value: "blocks", label: "Blocks" },
        { value: "tokens", label: "Tokens" },
        { value: "contracts", label: "Contracts" },
      ],
      suggestions: [],
      searchHistory: [],
      showDropdown: false,
      selectedIndex: -1,
      isSearching: false,
      isFocused: false,
      debounceTimer: null,
    };
  },

  computed: {
    currentPlaceholder() {
      const map = {
        all: this.placeholder,
        addresses: "Search by Neo N3 address (N...)",
        transactions: "Search by transaction hash (0x...)",
        blocks: "Search by block height or hash",
        tokens: "Search by token name or hash",
        contracts: "Search by contract hash",
      };
      return map[this.activeFilter] || this.placeholder;
    },
  },

  created() {
    this.loadHistory();
  },

  mounted() {
    document.addEventListener("click", this.handleClickOutside);
    document.addEventListener("keydown", this.handleGlobalKeydown);
  },

  beforeUnmount() {
    document.removeEventListener("click", this.handleClickOutside);
    document.removeEventListener("keydown", this.handleGlobalKeydown);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  },

  methods: {
    handleSearch() {
      if (this.query.trim()) {
        this.closeSuggestions();
        this.$emit("search", this.query.trim());
      }
    },

    handleInput() {
      this.selectedIndex = -1;
      if (this.debounceTimer) clearTimeout(this.debounceTimer);

      if (this.query.trim().length >= 2 && this.query.length <= 256) {
        this.isSearching = true;
        this.debounceTimer = setTimeout(() => {
          this.fetchSuggestions();
        }, 300);
      } else {
        this.suggestions = [];
        this.isSearching = false;
      }
    },

    handleFocus() {
      this.showDropdown = true;
      this.isFocused = true;
    },

    handleBlur() {
      this.isFocused = false;
    },

    closeSuggestions() {
      this.showDropdown = false;
      this.selectedIndex = -1;
    },

    handleClickOutside(e) {
      if (this.$refs.searchContainer && !this.$refs.searchContainer.contains(e.target)) {
        this.closeSuggestions();
      }
    },

    handleGlobalKeydown(e) {
      if (e.key === "/" && !this.isInputFocused()) {
        e.preventDefault();
        this.$refs.searchInput?.focus();
      }
    },

    isInputFocused() {
      const tag = document.activeElement?.tagName?.toLowerCase();
      return tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable;
    },

    navigateSuggestion(direction) {
      const items = this.query ? this.suggestions : this.searchHistory.slice(0, 5);
      if (items.length === 0) return;

      this.selectedIndex += direction;
      if (this.selectedIndex < 0) this.selectedIndex = items.length - 1;
      if (this.selectedIndex >= items.length) this.selectedIndex = 0;
    },

    async fetchSuggestions() {
      try {
        const q = this.query.trim();
        const suggestions = [];

        // Detect query type and create suggestions
        if (/^\d+$/.test(q)) {
          suggestions.push({
            type: "block",
            label: `Block #${parseInt(q).toLocaleString()}`,
            value: q,
          });
        }

        if (/^(0x)?[a-fA-F0-9]{40,64}$/.test(q)) {
          const hash = q.startsWith("0x") ? q : `0x${q}`;
          suggestions.push(
            { type: "transaction", label: "Transaction", value: hash },
            { type: "contract", label: "Contract", value: hash }
          );
        }

        if (/^N[A-Za-z0-9]{20,33}$/.test(q)) {
          suggestions.push({
            type: "address",
            label: "Address",
            value: q,
          });
        }

        this.suggestions = suggestions;
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
      } finally {
        this.isSearching = false;
      }
    },

    selectSuggestion(item) {
      this.query = item.value;
      this.addToHistory(item.value, item.type);
      this.closeSuggestions();
      this.$emit("search", item.value);
    },

    selectHistoryItem(item) {
      this.query = item.query;
      this.closeSuggestions();
      this.$emit("search", item.query);
    },

    // History management
    loadHistory() {
      try {
        const saved = localStorage.getItem(HISTORY_KEY);
        this.searchHistory = saved ? JSON.parse(saved) : [];
      } catch {
        this.searchHistory = [];
      }
    },

    addToHistory(query, type = "unknown") {
      const item = { query, type, timestamp: Date.now() };
      this.searchHistory = [item, ...this.searchHistory.filter((h) => h.query !== query)].slice(0, 10);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(this.searchHistory));
    },

    clearHistory() {
      this.searchHistory = [];
      localStorage.removeItem(HISTORY_KEY);
    },

    // UI helpers
    getTypeIcon(type) {
      const icons = {
        block: "Bk",
        transaction: "Tx",
        address: "Ad",
        contract: "Ct",
        token: "Tk",
      };
      return icons[type] || "?";
    },

    getTypeIconClass(type) {
      const classes = {
        block: "bg-primary-100 dark:bg-primary-900/30 text-primary-600",
        transaction: "bg-green-100 dark:bg-green-900/30 text-green-600",
        address: "bg-orange-100 dark:bg-orange-900/30 text-orange-600",
        contract: "bg-purple-100 dark:bg-purple-900/30 text-purple-600",
        token: "bg-blue-100 dark:bg-blue-900/30 text-blue-600",
      };
      return classes[type] || classes.block;
    },

    getTypeBadgeClass(type) {
      const classes = {
        block: "bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400",
        transaction: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
        address: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
        contract: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
        token: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      };
      return classes[type] || "bg-gray-100 text-gray-600";
    },
  },
};
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
