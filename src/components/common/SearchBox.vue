<template>
  <div ref="searchContainer" class="search-box relative" :class="{ 'w-full': mode === 'full' }">
    <div
      :class="[
        'relative flex items-center transition-all duration-200',
        mode === 'full'
          ? 'rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent'
          : 'rounded border border-white/20 bg-white/10 focus-within:border-white/40 focus-within:bg-white/15',
      ]"
    >
      <!-- Filter Dropdown (full mode only) -->
      <select
        v-if="mode === 'full'"
        v-model="activeFilter"
        class="h-full appearance-none border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 pl-3 pr-7 py-4 rounded-l-xl cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
        aria-label="Search filter"
      >
        <option v-for="f in filters" :key="f.value" :value="f.value">{{ f.label }}</option>
      </select>

      <!-- Search Icon -->
      <div class="flex-shrink-0 flex items-center gap-1.5" :class="mode === 'full' ? 'pl-3' : 'pl-2.5'">
        <svg
          class="w-4 h-4"
          :class="mode === 'full' ? 'text-gray-400 dark:text-gray-500' : 'text-white/50'"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <kbd
          v-if="!isFocused && mode === 'full'"
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
        :class="[
          'flex-1 bg-transparent focus:outline-none',
          mode === 'full'
            ? 'px-3 py-4 pr-28 text-gray-800 dark:text-gray-100 placeholder-gray-400 text-base'
            : 'px-2.5 py-2 pr-16 text-sm text-white placeholder-white/50',
        ]"
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
        aria-label="Submit search"
        :class="[
          'absolute right-1.5 top-1/2 -translate-y-1/2 font-medium transition-colors duration-200 flex items-center gap-1.5',
          mode === 'full'
            ? 'px-5 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg text-sm'
            : 'px-2.5 py-1 bg-primary-500 hover:bg-primary-600 disabled:bg-white/10 text-white rounded text-xs',
        ]"
      >
        <svg v-if="loading" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <svg v-if="mode === 'compact'" class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span v-if="mode === 'full'">Search</span>
      </button>
    </div>

    <!-- Search Dropdown (full mode only) -->
    <transition name="dropdown">
      <div
        v-if="showDropdown && mode === 'full'"
        id="search-dropdown"
        role="listbox"
        aria-label="Search suggestions"
        class="absolute w-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-dropdown border border-gray-100 dark:border-gray-700 overflow-hidden z-50 max-h-96 overflow-y-auto"
      >
        <!-- Search History -->
        <div v-if="!query && searchHistory.length > 0">
          <div class="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/50">
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide"
              >Recent Searches</span
            >
            <button
              @click.stop="clearHistory"
              aria-label="Clear search history"
              class="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Clear
            </button>
          </div>
          <div
            v-for="(item, index) in searchHistory.slice(0, MAX_HISTORY_DISPLAY)"
            :key="'h-' + index"
            :id="`suggestion-${index}`"
            role="option"
            :aria-selected="selectedIndex === index"
            :class="[
              'px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors',
              selectedIndex === index
                ? 'bg-primary-50 dark:bg-primary-900/20'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700',
            ]"
            @click="selectHistoryItem(item)"
          >
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span class="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{{ item.query }}</span>
            <span :class="getTypeBadgeClass(item.type)" class="text-xs px-2 py-0.5 rounded-full">{{ item.type }}</span>
          </div>
        </div>

        <!-- Search Suggestions -->
        <div v-if="query && suggestions.length > 0">
          <div class="px-4 py-2 bg-gray-50 dark:bg-gray-700/50">
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide"
              >Suggestions</span
            >
          </div>
          <div
            v-for="(item, index) in suggestions"
            :key="'s-' + index"
            :id="`suggestion-${index}`"
            role="option"
            :aria-selected="selectedIndex === index"
            :class="[
              'px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors',
              selectedIndex === index
                ? 'bg-primary-50 dark:bg-primary-900/20'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700',
            ]"
            @click="selectSuggestion(item)"
          >
            <span
              :class="getTypeIconClass(item.type)"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
              >{{ getTypeIcon(item.type) }}</span
            >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ item.label }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate font-mono">{{ item.value }}</p>
            </div>
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        <!-- Quick Search Tips -->
        <div v-if="!query && searchHistory.length === 0" class="p-4">
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
        <div v-if="query && suggestions.length === 0 && !isSearching" class="p-4 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Press Enter to search</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { getTypeIcon, getTypeIconClass, getTypeBadgeClass } from "@/utils/explorerFormat";
import { SEARCH_DEBOUNCE_MS } from "@/constants";

const HISTORY_KEY = "neo_explorer_search_history";
const MIN_SEARCH_LENGTH = 2;
const MAX_HISTORY_DISPLAY = 5;

const props = defineProps({
  placeholder: {
    type: String,
    default: "Search by Address / Txn Hash / Block / Token / Contract",
  },
  loading: { type: Boolean, default: false },
  mode: {
    type: String,
    default: "full",
    validator: (v) => ["full", "compact"].includes(v),
  },
});

const emit = defineEmits(["search"]);

const searchContainer = ref(null);
const searchInput = ref(null);
const query = ref("");
const activeFilter = ref("all");
const suggestions = ref([]);
const searchHistory = ref([]);
const showDropdown = ref(false);
const selectedIndex = ref(-1);
const isSearching = ref(false);
const isFocused = ref(false);
let debounceTimer = null;

const filters = [
  { value: "all", label: "All Filters" },
  { value: "addresses", label: "Addresses" },
  { value: "transactions", label: "Transactions" },
  { value: "blocks", label: "Blocks" },
  { value: "tokens", label: "Tokens" },
  { value: "contracts", label: "Contracts" },
];

const currentPlaceholder = computed(() => {
  if (props.mode === "compact") return "Search by Address / Txn Hash / Block";
  const map = {
    all: props.placeholder,
    addresses: "Search by Neo N3 address (N...)",
    transactions: "Search by transaction hash (0x...)",
    blocks: "Search by block height or hash",
    tokens: "Search by token name or hash",
    contracts: "Search by contract hash",
  };
  return map[activeFilter.value] || props.placeholder;
});

function handleSearch() {
  if (query.value.trim()) {
    closeSuggestions();
    addToHistory(query.value.trim(), detectType(query.value.trim()));
    emit("search", query.value.trim());
  }
}

function handleInput() {
  selectedIndex.value = -1;
  if (debounceTimer) clearTimeout(debounceTimer);
  if (query.value.trim().length >= MIN_SEARCH_LENGTH && query.value.length <= 256) {
    isSearching.value = true;
    debounceTimer = setTimeout(fetchSuggestions, SEARCH_DEBOUNCE_MS);
  } else {
    suggestions.value = [];
    isSearching.value = false;
  }
}

function handleFocus() {
  showDropdown.value = true;
  isFocused.value = true;
}

function handleBlur() {
  isFocused.value = false;
}

function closeSuggestions() {
  showDropdown.value = false;
  selectedIndex.value = -1;
}

function handleClickOutside(e) {
  if (searchContainer.value && !searchContainer.value.contains(e.target)) {
    closeSuggestions();
  }
}

function handleGlobalKeydown(e) {
  if (e.key === "/" && !isInputFocused()) {
    e.preventDefault();
    searchInput.value?.focus();
  }
}

function isInputFocused() {
  const tag = document.activeElement?.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable;
}

function navigateSuggestion(direction) {
  const items = query.value ? suggestions.value : searchHistory.value.slice(0, MAX_HISTORY_DISPLAY);
  if (items.length === 0) return;
  selectedIndex.value += direction;
  if (selectedIndex.value < 0) selectedIndex.value = items.length - 1;
  if (selectedIndex.value >= items.length) selectedIndex.value = 0;
}

function detectType(q) {
  if (/^\d+$/.test(q)) return "block";
  if (/^(0x)?[a-fA-F0-9]{40,64}$/.test(q)) return "transaction";
  if (/^N[A-Za-z0-9]{20,33}$/.test(q)) return "address";
  return "unknown";
}

function fetchSuggestions() {
  try {
    const q = query.value.trim();
    const result = [];
    if (/^\d+$/.test(q)) {
      result.push({ type: "block", label: `Block #${parseInt(q).toLocaleString()}`, value: q });
    }
    if (/^(0x)?[a-fA-F0-9]{40,64}$/.test(q)) {
      const hash = q.startsWith("0x") ? q : `0x${q}`;
      result.push(
        { type: "transaction", label: "Transaction", value: hash },
        { type: "contract", label: "Contract", value: hash }
      );
    }
    if (/^N[A-Za-z0-9]{20,33}$/.test(q)) {
      result.push({ type: "address", label: "Address", value: q });
    }
    suggestions.value = result;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("Failed to fetch suggestions:", err);
    suggestions.value = [];
  } finally {
    isSearching.value = false;
  }
}

function selectSuggestion(item) {
  query.value = item.value;
  addToHistory(item.value, item.type);
  closeSuggestions();
  emit("search", item.value);
}

function selectHistoryItem(item) {
  query.value = item.query;
  closeSuggestions();
  emit("search", item.query);
}

function loadHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    searchHistory.value = saved ? JSON.parse(saved) : [];
  } catch {
    searchHistory.value = [];
  }
}

function addToHistory(q, type = "unknown") {
  const item = { query: q, type, timestamp: Date.now() };
  searchHistory.value = [item, ...searchHistory.value.filter((h) => h.query !== q)].slice(0, 10);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistory.value));
}

function clearHistory() {
  searchHistory.value = [];
  localStorage.removeItem(HISTORY_KEY);
}

defineExpose({ focus: () => searchInput.value?.focus() });

onMounted(() => {
  loadHistory();
  document.addEventListener("click", handleClickOutside);
  document.addEventListener("keydown", handleGlobalKeydown);
});

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("keydown", handleGlobalKeydown);
});
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
