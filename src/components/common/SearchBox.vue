<template>
  <div
    ref="searchContainer"
    class="search-box relative group overflow-visible"
    :class="[mode === 'full' ? 'w-full' : '', showDropdown ? 'z-[140]' : 'z-20']"
  >
    <div
      :class="[
        'search-input-shell relative flex min-w-0 items-center transition-all duration-300 rounded-xl backdrop-blur-md shadow-card focus-within:shadow-[0_0_20px_rgba(0,229,153,0.3)]',
        mode === 'full' 
          ? 'h-[64px] border border-white/20 bg-white/10 hover:border-white/30 focus-within:border-primary-500' 
          : 'h-[44px] border border-line-soft bg-surface/80 hover:border-primary-400 focus-within:border-primary-500',
      ]"
    >
      <!-- Filter Dropdown (full mode only) -->
      <select
        v-if="mode === 'full'"
        v-model="activeFilter"
        name="filter"
        class="search-filter-select h-full cursor-pointer appearance-none rounded-l-xl border-r border-white/20 bg-transparent hover:bg-white/5 py-4 pl-4 pr-10 text-sm font-bold text-white transition-colors focus:outline-none focus:ring-0 flex-shrink-0"
        :aria-label="t('searchBox.ariaFilter')"
      >
        <option v-for="f in filters" :key="f.value" :value="f.value" class="bg-slate-900 text-white">
          {{ t(f.labelKey) }}
        </option>
      </select>

      <!-- Search Icon -->
      <div class="search-icon-cell flex-shrink-0 flex items-center gap-1.5" :class="mode === 'full' ? 'pl-5' : 'pl-4'">
        <svg
          class="w-4 h-4 transition-colors duration-300 group-focus-within:text-primary-500"
          :class="mode === 'full' ? 'text-white/70' : 'text-mid'"
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
          v-if="mode === 'full'"
          :class="[
            'border-white/20 text-[10px] font-bold text-white/70 border bg-white/10 transition-all duration-300 hidden sm:inline-flex h-6 w-6 items-center justify-center rounded-md',
            isFocused ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'
          ]"
          :title="$t('aria.pressSlashToSearch')"
          >/</kbd
        >
      </div>

      <!-- Input -->
      <input
        ref="searchInput"
        v-model="query"
        type="text"
        name="q"
        :placeholder="currentPlaceholder"
        :class="[
          'search-input min-w-0 flex-1 bg-transparent focus:outline-none focus:ring-0 focus:border-transparent font-medium',
          mode === 'full'
            ? 'px-4 py-4 pr-28 text-base border-none text-white placeholder:text-white/55'
            : 'px-3 py-2 pr-12 text-sm border-none text-high placeholder:text-mid',
        ]"
        @keyup.enter="handleEnter"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown.down.prevent="navigateSuggestion(1)"
        @keydown.up.prevent="navigateSuggestion(-1)"
        @keydown.escape="closeSuggestions"
        autocomplete="off"
        role="combobox"
        :aria-label="t('searchBox.ariaSearchInput')"
        :aria-expanded="showDropdown"
        aria-controls="search-dropdown"
        aria-autocomplete="list"
        :aria-activedescendant="selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined"
      />

      <!-- Search Button -->
      <button
        @click="handleSearch"
        :disabled="loading || !query.trim()"
        :aria-label="t('searchBox.ariaSubmit')"
        :class="[
          'search-submit-btn absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center gap-1.5',
          mode === 'full'
            ? 'btn-primary'
            : 'btn-primary h-[32px] w-[32px] !px-0 rounded-lg',
        ]"
      >
        <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <svg v-else-if="mode === 'compact'" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span v-if="mode === 'full'">{{ t("searchBox.submit") }}</span>
      </button>
    </div>

    <!-- Search Dropdown (full mode only) -->
    <transition name="dropdown">
      <div
        v-if="showDropdown && mode === 'full'"
        id="search-dropdown"
        role="listbox"
        :aria-label="t('searchBox.ariaSuggestions')"
        class="surface-panel soft-divider absolute z-[150] mt-2 max-h-96 w-full overflow-hidden overflow-y-auto rounded-2xl border shadow-[0_10px_40px_rgba(0,0,0,0.2)]"
      >
        <!-- Search History -->
        <div v-if="!query && searchHistory.length > 0">
          <div class="search-group-header flex items-center justify-between px-4 py-2">
            <span class="text-mid text-xs font-medium uppercase tracking-wide">{{
              t("searchBox.recentSearches")
            }}</span>
            <button
              @click.stop="clearHistory"
              :aria-label="t('searchBox.ariaClearHistory')"
              class="text-low hover:text-error text-xs transition-colors"
            >
              {{ t("searchBox.clearHistory") }}
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
              selectedIndex === index ? 'bg-primary-50 dark:bg-primary-900/25' : 'list-row',
            ]"
            @click="selectHistoryItem(item)"
          >
            <svg class="text-low w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span class="text-high truncate flex-1 text-sm">{{ item.query }}</span>
            <span :class="getTypeBadgeClass(item.type)" class="text-xs px-2 py-0.5 rounded-full">{{ item.type }}</span>
          </div>
        </div>

        <!-- Search Suggestions -->
        <div v-if="query && suggestions.length > 0">
          <div class="search-group-header px-4 py-2">
            <span class="text-mid text-xs font-medium uppercase tracking-wide">{{
              t("searchBox.suggestions")
            }}</span>
          </div>
          <div
            v-for="(item, index) in suggestions"
            :key="'s-' + index"
            :id="`suggestion-${index}`"
            role="option"
            :aria-selected="selectedIndex === index"
            :class="[
              'px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors',
              selectedIndex === index ? 'bg-primary-50 dark:bg-primary-900/25' : 'list-row',
            ]"
            @click="selectSuggestion(item)"
          >
            <span
              :class="getTypeIconClass(item.type)"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
              >{{ getTypeIcon(item.type) }}</span
            >
            <div class="flex-1 min-w-0">
              <p class="text-high truncate text-sm font-medium">{{ item.label }}</p>
              <p class="text-mid truncate font-mono text-xs">{{ item.value }}</p>
            </div>
            <svg class="text-low w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        <!-- Quick Search Tips -->
        <div v-if="!query && searchHistory.length === 0" class="p-4">
          <p class="text-mid mb-3 text-xs font-medium uppercase tracking-wide">
            {{ t("searchBox.searchTips") }}
          </p>
          <div class="space-y-2">
            <div class="text-mid flex items-center gap-2 text-sm">
              <span
                class="w-6 h-6 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-500 flex items-center justify-center text-xs"
                >Bk</span
              >
              <i18n-t keypath="searchBox.tipBlockHeight" tag="span">
                <template #example><code class="search-tip-code rounded px-1">12345678</code></template>
              </i18n-t>
            </div>
            <div class="text-mid flex items-center gap-2 text-sm">
              <span
                class="w-6 h-6 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-500 flex items-center justify-center text-xs"
                >Tx</span
              >
              <i18n-t keypath="searchBox.tipTransactionHash" tag="span">
                <template #example><code class="search-tip-code rounded px-1">0x...</code></template>
              </i18n-t>
            </div>
            <div class="text-mid flex items-center gap-2 text-sm">
              <span
                class="w-6 h-6 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-500 flex items-center justify-center text-xs"
                >Ad</span
              >
              <i18n-t keypath="searchBox.tipAddress" tag="span">
                <template #example><code class="search-tip-code rounded px-1">N...</code></template>
              </i18n-t>
            </div>
          </div>
        </div>

        <!-- No Results -->
        <div v-if="query && suggestions.length === 0 && !isSearching" class="p-4 text-center">
          <p class="text-mid text-sm">{{ t("searchBox.pressEnterToSearch") }}</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { isValidNeoAddress, isValidTxHash } from "@/utils/addressFormat";
import { getTypeIcon, getTypeIconClass, getTypeBadgeClass } from "@/utils/searchPresentation";
import { SEARCH_DEBOUNCE_MS } from "@/constants";

const { t } = useI18n();

const HISTORY_KEY = "neo_explorer_search_history";
const MIN_SEARCH_LENGTH = 2;
const MAX_HISTORY_DISPLAY = 5;

const props = defineProps({
  // Caller may override the default placeholder. Empty string falls back to
  // the locale-aware default below so a missing prop doesn't pin English.
  placeholder: {
    type: String,
    default: "",
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
let suggestionGeneration = 0;
let searchServiceModulePromise = null;
const FULL_HASH_PATTERN = /^(0x)?[a-fA-F0-9]{64}$/;
const CONTRACT_HASH_PATTERN = /^(0x)?[a-fA-F0-9]{40}$/;

function normalizeHash(value) {
  return value.startsWith("0x") ? value : `0x${value}`;
}

function isNnsDomain(value) {
  const normalized = String(value || "").trim();
  return (normalized.endsWith(".neo") && normalized.length > 4) || (normalized.endsWith(".matrix") && normalized.length > 7);
}

const filters = [
  { value: "all", labelKey: "searchBox.filterAll" },
  { value: "addresses", labelKey: "searchBox.filterAddresses" },
  { value: "transactions", labelKey: "searchBox.filterTransactions" },
  { value: "blocks", labelKey: "searchBox.filterBlocks" },
  { value: "tokens", labelKey: "searchBox.filterTokens" },
  { value: "contracts", labelKey: "searchBox.filterContracts" },
];

const currentPlaceholder = computed(() => {
  if (props.mode === "compact") return t("searchBox.placeholderCompact");
  const fallback = props.placeholder || t("searchBox.placeholderDefault");
  const map = {
    all: fallback,
    addresses: t("searchBox.placeholderAddresses"),
    transactions: t("searchBox.placeholderTransactions"),
    blocks: t("searchBox.placeholderBlocks"),
    tokens: t("searchBox.placeholderTokens"),
    contracts: t("searchBox.placeholderContracts"),
  };
  return map[activeFilter.value] || fallback;
});

function handleSearch() {
  if (query.value.trim()) {
    closeSuggestions();
    addToHistory(query.value.trim(), detectType(query.value.trim()));
    emit("search", query.value.trim());
  }
}

function handleEnter() {
  if (selectedIndex.value >= 0) {
    const items = query.value ? suggestions.value : searchHistory.value.slice(0, MAX_HISTORY_DISPLAY);
    const picked = items[selectedIndex.value];
    if (picked) {
      if (query.value) {
        selectSuggestion(picked);
      } else {
        selectHistoryItem(picked);
      }
      return;
    }
  }

  handleSearch();
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
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
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
  if (isValidTxHash(q) || FULL_HASH_PATTERN.test(q)) return "transaction";
  if (CONTRACT_HASH_PATTERN.test(q)) return "contract";
  if (isValidNeoAddress(q) || isNnsDomain(q)) return "address";
  return "unknown";
}

function currentSuggestionType() {
  return activeFilter.value === "all" ? "" : activeFilter.value;
}

function localSuggestionsForQuery(q) {
  const result = [];
  if (/^\d+$/.test(q)) {
    result.push({ type: "block", label: `Block #${parseInt(q).toLocaleString()}`, value: q });
  }
  if (isValidTxHash(q) || FULL_HASH_PATTERN.test(q)) {
    const hash = normalizeHash(q);
    result.push(
      { type: "transaction", label: "Transaction", value: hash },
      { type: "contract", label: "Contract", value: hash }
    );
  }
  if (CONTRACT_HASH_PATTERN.test(q) && !FULL_HASH_PATTERN.test(q)) {
    const hash = normalizeHash(q);
    result.push({ type: "contract", label: "Contract", value: hash });
  }
  if (isValidNeoAddress(q) || isNnsDomain(q)) {
    result.push({ type: "address", label: "Address/NNS", value: q });
  }
  return result;
}

function dedupeSuggestions(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.type}:${item.value || item.route || item.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function loadSearchService() {
  if (!searchServiceModulePromise) {
    searchServiceModulePromise = import("@/services/searchService");
  }
  const module = await searchServiceModulePromise;
  return module.searchService;
}

async function fetchSuggestions() {
  const generation = ++suggestionGeneration;
  try {
    const q = query.value.trim();
    const local = localSuggestionsForQuery(q);
    suggestions.value = local;

    if (props.mode !== "full") return;

    const searchService = await loadSearchService();
    const remote = await searchService.suggest(q, {
      type: currentSuggestionType(),
      limit: 6,
    });
    if (generation !== suggestionGeneration || q !== query.value.trim()) return;
    suggestions.value = dedupeSuggestions([...remote, ...local]).slice(0, 8);
  } catch (err) {
    if (import.meta.env.DEV) console.error("Failed to fetch suggestions:", err);
    suggestions.value = localSuggestionsForQuery(query.value.trim());
  } finally {
    if (generation === suggestionGeneration) isSearching.value = false;
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
.search-shortcut {
  border-color: var(--line-soft);
  background: var(--surface-hover);
  color: var(--text-low);
}

.search-group-header {
  background: color-mix(in srgb, var(--surface-hover) 88%, transparent);
  border-bottom: 1px solid var(--line-soft);
}

.search-filter {
  background: color-mix(in srgb, var(--surface-elevated) 92%, transparent);
  color: var(--text-high);
}

.search-filter:hover {
  background: color-mix(in srgb, var(--surface-hover) 88%, transparent);
}

.search-filter-option {
  background: var(--surface-elevated);
  color: var(--text-high);
}

.search-submit-btn:hover:not(:disabled),
.search-submit-btn:active:not(:disabled) {
  transform: translateY(-50%);
}

.search-tip-code {
  background: var(--surface-hover);
  color: var(--text-high);
}

@media (max-width: 480px) {
  .search-filter-select {
    max-width: 8.5rem;
    padding-left: 1rem;
    padding-right: 2rem;
  }

  .search-icon-cell {
    padding-left: 0.75rem;
  }

  .search-input {
    padding-left: 0.75rem;
    padding-right: 5.75rem;
  }

  .search-submit-btn.btn-primary {
    min-width: 5rem;
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

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
