<template>
  <div class="x-home-page">
    <!-- Hero Section (dark in both themes, mirrors N3 HomePage hero) -->
    <PageHero :particles="3">
      <section class="hero-section relative border-b border-white/10 bg-transparent animate-page-enter">
        <div class="hero-overlay"></div>
        <div class="page-container relative z-30 py-10 md:py-14">
          <div class="mx-auto max-w-3xl text-center">
            <img
              src="/img/brand/neox-logo-white.svg"
              alt="Neo X"
              class="mx-auto mb-4 h-9 w-auto object-contain md:h-10"
            />
            <h1 class="text-balance text-3xl font-extrabold tracking-tight text-white md:text-4xl neon-glow-text">
              {{ tf("pageTitles.xHome", "Neo X Explorer") }}
            </h1>
            <p class="mt-2 text-sm text-white/70">
              {{ netLabel }} · {{ tf("neoX.evmChain", "EVM sidechain") }}
            </p>
            <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
              <ChainSwitchTabs />
              <AddNeoxChainButton />
            </div>

            <!-- Hero search -->
            <form class="relative z-30 mt-6" role="search" @submit.prevent="submitSearch">
              <div
                class="relative flex h-[56px] min-w-0 items-center rounded-xl border border-white/20 bg-white/10 shadow-card backdrop-blur-md transition-all duration-300 hover:border-white/30 focus-within:border-primary-500 focus-within:shadow-[0_0_20px_rgba(0,229,153,0.3)]"
              >
                <div class="flex flex-shrink-0 items-center pl-5">
                  <svg
                    class="h-4 w-4 text-white/70 transition-colors duration-300"
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
                </div>
                <input
                  ref="searchInput"
                  v-model="searchQuery"
                  type="text"
                  name="q"
                  autocomplete="off"
                  role="combobox"
                  aria-controls="x-home-search-listbox"
                  :aria-expanded="showSuggestions"
                  :aria-activedescendant="highlightedIndex >= 0 ? `x-home-search-option-${highlightedIndex}` : undefined"
                  :aria-label="tf('neoX.searchAria', 'Search Neo X')"
                  :placeholder="tf('neoX.searchPlaceholder', 'Search by address / tx hash / block / token')"
                  class="min-w-0 flex-1 border-none bg-transparent px-4 py-4 text-base font-medium text-white placeholder:text-white/55 focus:border-transparent focus:outline-none focus:ring-0"
                  @input="handleSearchInput"
                  @focus="handleSearchFocus"
                  @blur="handleSearchBlur"
                  @keydown.down.prevent="moveHighlight(1)"
                  @keydown.up.prevent="moveHighlight(-1)"
                  @keydown.escape="closeSuggestions"
                />
                <svg
                  v-if="searchLoading"
                  class="mr-5 h-4 w-4 flex-shrink-0 animate-spin text-white/70"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  ></path>
                </svg>
              </div>

              <!-- Typed suggestions dropdown -->
              <div
                v-if="showSuggestions"
                class="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-line-soft bg-surface-elevated text-left shadow-dropdown"
              >
                <ul
                  v-if="suggestions.length > 0"
                  id="x-home-search-listbox"
                  role="listbox"
                  class="soft-divider max-h-80 divide-y overflow-y-auto"
                >
                  <li
                    v-for="(item, index) in suggestions"
                    :id="`x-home-search-option-${index}`"
                    :key="`${item.type}-${item.value}`"
                    role="option"
                    :aria-selected="index === highlightedIndex"
                  >
                    <button
                      type="button"
                      class="list-row flex w-full items-center gap-2 px-4 py-2.5 text-left"
                      :class="index === highlightedIndex ? 'bg-surface-hover' : ''"
                      @mousedown.prevent="goToSuggestion(item)"
                      @mousemove="highlightedIndex = index"
                    >
                      <span class="badge-soft flex-shrink-0 text-[10px] font-semibold uppercase text-mid">
                        {{ suggestionTypeLabel(item.type) }}
                      </span>
                      <span class="min-w-0 flex-1 truncate font-hash text-sm text-high">{{ item.label }}</span>
                    </button>
                  </li>
                </ul>
                <p v-else class="px-4 py-3 text-sm text-mid">
                  {{ tf("neoX.noResults", "No results found") }}
                </p>
              </div>
            </form>
          </div>
        </div>
      </section>
    </PageHero>

    <!-- Stats card (overlapping hero) -->
    <section class="relative z-20 mx-auto -mt-8 max-w-[1400px] px-4 animate-page-enter animate-page-enter-delay-1">
      <div class="etherscan-card p-4 md:p-5">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <!-- Latest Block -->
          <div class="stat-block">
            <div class="flex items-center gap-2">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-icon-primary">
                <svg class="h-4 w-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <div>
                <div class="stat-label">{{ tf("neoX.latestBlock", "Latest Block") }}</div>
                <div class="stat-value">
                  <Skeleton v-if="blocksLoading && latestBlockHeight == null" width="80px" height="28px" class="mt-1 inline-block" />
                  <AnimatedNumber v-else-if="latestBlockHeight != null" :value="latestBlockHeight" />
                  <span v-else>—</span>
                </div>
              </div>
            </div>
            <div class="mt-1 text-xs text-mid">{{ netLabel }}</div>
          </div>

          <!-- Total Transactions -->
          <div class="stat-block">
            <div class="flex items-center gap-2">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-icon-green">
                <svg class="h-4 w-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div>
                <div class="stat-label">{{ tf("neoX.totalTxns", "Transactions") }}</div>
                <div class="stat-value">
                  <Skeleton v-if="statsLoading && !stats" width="80px" height="28px" class="mt-1 inline-block" />
                  <AnimatedNumber v-else-if="stats" :value="stats.totalTransactions" />
                  <span v-else>—</span>
                </div>
              </div>
            </div>
            <div class="mt-1 text-xs text-mid">
              {{ tf("neoX.txnsToday", "Txns Today") }}: {{ stats ? formatInt(stats.transactionsToday) : "—" }}
            </div>
          </div>

          <!-- Gas Price -->
          <div class="stat-block">
            <div class="flex items-center gap-2">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-icon-orange">
                <svg class="h-4 w-4 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div class="stat-label">{{ tf("neoX.gasPrice", "Gas Price") }}</div>
                <div class="stat-value">
                  <Skeleton v-if="statsLoading && !stats" width="80px" height="28px" class="mt-1 inline-block" />
                  <span v-else>{{ gasPriceLabel }}</span>
                </div>
              </div>
            </div>
            <div class="mt-1 text-xs text-mid">{{ avgBlockTimeSub || "—" }}</div>
          </div>

          <!-- Total Addresses -->
          <div class="stat-block">
            <div class="flex items-center gap-2">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-icon-purple">
                <svg
                  class="h-4 w-4 text-violet-500 dark:text-violet-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <div class="stat-label">{{ tf("neoX.totalAddresses", "Addresses") }}</div>
                <div class="stat-value">
                  <Skeleton v-if="statsLoading && !stats" width="80px" height="28px" class="mt-1 inline-block" />
                  <AnimatedNumber v-else-if="stats" :value="stats.totalAddresses" />
                  <span v-else>—</span>
                </div>
              </div>
            </div>
            <div class="mt-1 text-xs text-mid">{{ tf("neoX.evmChain", "EVM sidechain") }}</div>
          </div>
        </div>

        <!-- Secondary mini-stats row -->
        <div class="soft-divider mt-4 border-t pt-4">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div class="mini-stat">
              <span class="mini-label">{{ tf("neoX.txnsToday", "Txns Today") }}</span>
              <span class="mini-value">{{ stats ? formatInt(stats.transactionsToday) : "—" }}</span>
            </div>
            <div class="mini-stat">
              <span class="mini-label">{{ tf("neoX.gasUsedToday", "Gas Used Today") }}</span>
              <span class="mini-value">{{ gasUsedTodayLabel }}</span>
            </div>
            <div class="mini-stat">
              <span class="mini-label">{{ tf("neoX.networkUtilization", "Network Utilization") }}</span>
              <span class="mini-value">{{ networkUtilizationLabel }}</span>
            </div>
            <div class="mini-stat">
              <span class="mini-label">{{ tf("neoX.mempool", "Mempool") }}</span>
              <span class="mini-value">{{ mempoolLabel }}</span>
            </div>
            <div class="mini-stat">
              <span class="mini-label">{{ tf("neoX.indexingStatus", "Indexing Status") }}</span>
              <span
                v-if="indexing && indexing.finishedIndexing"
                class="inline-flex items-center rounded bg-status-success-bg px-2 py-0.5 text-xs font-semibold text-status-success"
              >
                {{ tf("neoX.synced", "Synced") }}
              </span>
              <span
                v-else-if="indexing"
                class="inline-flex items-center rounded bg-status-warning-bg px-2 py-0.5 text-xs font-semibold text-status-warning"
              >
                {{ tf("neoX.indexing", "Indexing") }}{{ indexingRatioLabel }}
              </span>
              <span v-else class="mini-value">—</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Latest Blocks + Latest Transactions -->
    <section class="page-shell animate-page-enter animate-page-enter-delay-2">
      <div class="page-container py-1">
        <div class="grid items-stretch gap-4 xl:grid-cols-2">
          <article class="etherscan-card flex h-full flex-col overflow-hidden">
            <header class="card-header">
              <h2 class="text-high text-base font-semibold">{{ tf("neoX.latestBlocks", "Latest Blocks") }}</h2>
              <RouterLink to="/x/blocks" class="btn-outline text-xs">{{ tf("neoX.viewAll", "View All") }}</RouterLink>
            </header>
            <div v-if="blocksLoading && !latestBlocks.length" class="grid flex-1 grid-rows-6 gap-2 p-4">
              <Skeleton v-for="i in LATEST_ROWS" :key="i" height="54px" />
            </div>
            <div v-else-if="blocksError && !latestBlocks.length" class="p-4">
              <ErrorState
                :title="tf('neoX.blocksUnavailable', 'Unable to load latest blocks')"
                :message="tf('neoX.tryAgain', 'Please try again in a moment.')"
                @retry="loadAll"
              />
            </div>
            <TransitionGroup v-else name="list" tag="div" class="relative grid flex-1 grid-rows-6 overflow-hidden">
              <XBlockListItem v-for="block in latestBlocks" :key="block.hash || block.index" :block="block" />
            </TransitionGroup>
          </article>

          <article class="etherscan-card flex h-full flex-col overflow-hidden">
            <header class="card-header">
              <h2 class="text-high text-base font-semibold">{{ tf("neoX.latestTxns", "Latest Transactions") }}</h2>
              <RouterLink to="/x/transactions" class="btn-outline text-xs">
                {{ tf("neoX.viewAll", "View All") }}
              </RouterLink>
            </header>
            <div v-if="txsLoading && !latestTxs.length" class="grid flex-1 grid-rows-6 gap-2 p-4">
              <Skeleton v-for="i in LATEST_ROWS" :key="i" height="54px" />
            </div>
            <div v-else-if="txsError && !latestTxs.length" class="p-4">
              <ErrorState
                :title="tf('neoX.txnsUnavailable', 'Unable to load latest transactions')"
                :message="tf('neoX.tryAgain', 'Please try again in a moment.')"
                @retry="loadAll"
              />
            </div>
            <TransitionGroup v-else name="list" tag="div" class="relative grid flex-1 grid-rows-6 overflow-hidden">
              <XTxListItem v-for="tx in latestTxs" :key="tx.hash" :tx="tx" />
            </TransitionGroup>
          </article>
        </div>

        <div class="mt-4 animate-page-enter animate-page-enter-delay-3">
          <XTxChart />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import PageHero from "@/components/common/PageHero.vue";
import ChainSwitchTabs from "@/components/common/ChainSwitchTabs.vue";
import AddNeoxChainButton from "@/components/common/AddNeoxChainButton.vue";
import AnimatedNumber from "@/components/common/AnimatedNumber.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import XBlockListItem from "./components/XBlockListItem.vue";
import XTxListItem from "./components/XTxListItem.vue";
import XTxChart from "./components/XTxChart.vue";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { getNeoxNet, getNeoxLabel, getNeoxRefreshIntervalMs } from "@/utils/neoxEnv";
import { statsService, blockService, transactionService, searchService, rpcService } from "@/services/neox";
import { formatInt } from "@/utils/neoxFormat";
import { NEOX_HOME_FEED_ROWS, readHomeFeed, reconcileHomeFeed } from "@/services/neox/homeFeedCache";

const SEARCH_DEBOUNCE_MS = 300;
const LATEST_ROWS = NEOX_HOME_FEED_ROWS;

const router = useRouter();
const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

// --- Data state ---
const stats = ref(null);
const indexing = ref(null);
const mempool = ref(null);
const latestBlocks = ref([]);
const latestTxs = ref([]);
const statsLoading = ref(true);
const blocksLoading = ref(true);
const txsLoading = ref(true);
const blocksError = ref(false);
const txsError = ref(false);
const activeNet = ref(getNeoxNet());

const netLabel = computed(() => getNeoxLabel(activeNet.value));
const latestBlockHeight = computed(() => {
  const heights = [stats.value?.totalBlocks, ...latestBlocks.value.map((block) => block?.index)]
    .map(Number)
    .filter(Number.isFinite);
  return heights.length ? Math.max(...heights) : null;
});

const gasPriceLabel = computed(() => {
  const prices = stats.value?.gasPrices;
  if (!prices) return "—";
  const avg = prices.average ?? prices.fast ?? prices.slow;
  return avg != null ? `${avg} Gwei` : "—";
});

const avgBlockTimeSub = computed(() =>
  stats.value
    ? `${tf("neoX.avgBlockTime", "Avg block")} ${(stats.value.averageBlockTimeMs / 1000).toFixed(1)}s`
    : ""
);

const gasUsedTodayLabel = computed(() => {
  const raw = stats.value?.gasUsedToday;
  if (raw == null || raw === "") return "—";
  const n = Number(raw);
  return Number.isFinite(n) ? formatInt(n) : String(raw);
});

const networkUtilizationLabel = computed(() => {
  const pct = stats.value?.networkUtilizationPct;
  if (pct == null || !Number.isFinite(Number(pct))) return "—";
  return `${Number(pct).toFixed(2)}%`;
});

// Mempool depth via the node RPC proxy; degrades to an em dash, never an error.
const mempoolLabel = computed(() => {
  if (!mempool.value) return "—";
  const pending = `${formatInt(mempool.value.pending)} ${tf("neoX.mempoolPending", "pending")}`;
  const queued = `${formatInt(mempool.value.queued)} ${tf("neoX.mempoolQueued", "queued")}`;
  return `${pending} · ${queued}`;
});

const indexingRatioLabel = computed(() => {
  const ratio = Number(indexing.value?.indexedBlocksRatio);
  if (!Number.isFinite(ratio) || ratio <= 0) return "";
  return ` ${Math.min(100, Math.round(ratio * 100))}%`;
});

let loadGeneration = 0;

async function loadAll({ silent = false } = {}) {
  const generation = ++loadGeneration;
  const net = getNeoxNet();
  activeNet.value = net;

  if (!silent) {
    const cachedBlocks = readHomeFeed(net, "blocks", LATEST_ROWS);
    const cachedTxs = readHomeFeed(net, "transactions", LATEST_ROWS);
    stats.value = null;
    indexing.value = null;
    mempool.value = null;
    latestBlocks.value = cachedBlocks;
    latestTxs.value = cachedTxs;
    blocksError.value = false;
    txsError.value = false;
    statsLoading.value = true;
    blocksLoading.value = cachedBlocks.length === 0;
    txsLoading.value = cachedTxs.length === 0;
  }

  const [s, idx, b, tx, pool] = await Promise.allSettled([
    statsService.getStats({ net }),
    statsService.getIndexingStatus({ net }),
    blockService.getLatest(LATEST_ROWS, { net }),
    transactionService.getLatest(LATEST_ROWS, { net }),
    rpcService.getTxpoolStatus({ net }),
  ]);
  if (generation !== loadGeneration) return;

  if (s.status === "fulfilled") {
    stats.value = s.value;
  } else if (!silent) {
    stats.value = null;
  }
  if (idx.status === "fulfilled") {
    indexing.value = idx.value;
  } else if (!silent) {
    indexing.value = null;
  }
  if (pool.status === "fulfilled") {
    mempool.value = pool.value;
  } else if (!silent) {
    mempool.value = null;
  }

  if (b.status === "fulfilled") {
    latestBlocks.value = reconcileHomeFeed(latestBlocks.value, b.value, "blocks", LATEST_ROWS);
    blocksError.value = false;
  } else {
    blocksError.value = true;
  }
  if (tx.status === "fulfilled") {
    latestTxs.value = reconcileHomeFeed(latestTxs.value, tx.value, "transactions", LATEST_ROWS);
    txsError.value = false;
  } else {
    txsError.value = true;
  }

  statsLoading.value = false;
  blocksLoading.value = false;
  txsLoading.value = false;
}

// --- Auto refresh ---
let refreshTimer = null;

function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = setInterval(() => {
    // Skip refresh work while the tab is hidden; the next visible tick
    // catches up. Saves a request burst every 6s for backgrounded tabs.
    if (typeof document !== "undefined" && document.hidden) return;
    loadAll({ silent: true });
  }, getNeoxRefreshIntervalMs());
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

// --- Hero search ---
const searchInput = ref(null);
const searchQuery = ref("");
const suggestions = ref([]);
const showSuggestions = ref(false);
const highlightedIndex = ref(-1);
const searchLoading = ref(false);

let searchDebounceTimer = null;
let searchToken = 0;

const SUGGESTION_TYPE_FALLBACKS = {
  block: "Block",
  transaction: "Tx",
  token: "Token",
  address: "Address",
  contract: "Contract",
};

function suggestionTypeLabel(type) {
  const key = String(type || "").toLowerCase();
  return tf(`neoX.searchType.${key}`, SUGGESTION_TYPE_FALLBACKS[key] || key);
}

async function fetchSuggestions(query) {
  const token = ++searchToken;
  searchLoading.value = true;
  try {
    const results = await searchService.search(query, { net: getNeoxNet() });
    if (token !== searchToken) return;
    suggestions.value = Array.isArray(results) ? results.slice(0, 8) : [];
    highlightedIndex.value = -1;
    showSuggestions.value = true;
  } catch (_err) {
    if (token !== searchToken) return;
    suggestions.value = [];
    showSuggestions.value = false;
  } finally {
    if (token === searchToken) searchLoading.value = false;
  }
}

function handleSearchInput() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  const query = searchQuery.value.trim();
  if (!query) {
    searchToken += 1;
    suggestions.value = [];
    showSuggestions.value = false;
    highlightedIndex.value = -1;
    searchLoading.value = false;
    return;
  }
  searchDebounceTimer = setTimeout(() => fetchSuggestions(query), SEARCH_DEBOUNCE_MS);
}

function handleSearchFocus() {
  if (searchQuery.value.trim() && suggestions.value.length > 0) {
    showSuggestions.value = true;
  }
}

function handleSearchBlur() {
  // Delay so a suggestion mousedown can run before the dropdown closes.
  setTimeout(() => {
    showSuggestions.value = false;
    highlightedIndex.value = -1;
  }, 150);
}

function closeSuggestions() {
  showSuggestions.value = false;
  highlightedIndex.value = -1;
}

function moveHighlight(step) {
  if (!showSuggestions.value || suggestions.value.length === 0) return;
  const count = suggestions.value.length;
  highlightedIndex.value = (highlightedIndex.value + step + count) % count;
}

function goToSuggestion(item) {
  if (!item?.route) return;
  closeSuggestions();
  searchQuery.value = "";
  suggestions.value = [];
  Promise.resolve(router.push(item.route)).catch(() => {});
}

async function submitSearch() {
  const query = searchQuery.value.trim();
  if (!query) return;

  if (showSuggestions.value && highlightedIndex.value >= 0) {
    goToSuggestion(suggestions.value[highlightedIndex.value]);
    return;
  }

  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  const token = ++searchToken;
  searchLoading.value = true;
  try {
    const results = await searchService.search(query, { net: getNeoxNet() });
    if (token !== searchToken) return;
    if (Array.isArray(results) && results.length > 0) {
      goToSuggestion(results[0]);
    } else {
      suggestions.value = [];
      highlightedIndex.value = -1;
      showSuggestions.value = true;
    }
  } catch (_err) {
    if (token !== searchToken) return;
    suggestions.value = [];
    highlightedIndex.value = -1;
    showSuggestions.value = true;
  } finally {
    if (token === searchToken) searchLoading.value = false;
  }
}

// --- Lifecycle ---
onMounted(() => {
  loadAll();
  startAutoRefresh();
});

useNetworkChange(() => {
  loadAll();
});

onBeforeUnmount(() => {
  stopAutoRefresh();
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
});
</script>

<style scoped>
/* Same list slide animation as the N3 LatestBlocks/LatestTransactions cards. */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
.list-leave-active {
  position: absolute;
  width: 100%;
}

/* Same hero recipe as the N3 HomePage (scoped there, so duplicated here). */
.hero-section {
  background-image:
    radial-gradient(circle at 15% 20%, rgba(0, 229, 153, 0.2), transparent 36%),
    radial-gradient(circle at 85% 10%, rgba(0, 229, 153, 0.12), transparent 30%),
    linear-gradient(180deg, #0a0f1a 0%, #0f1923 100%);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 26px 26px;
  opacity: 0.28;
}

/* Stat tiles — same recipes as HomeStats.vue (scoped there). */
.stat-block {
  @apply rounded-lg border p-3;
  border-color: var(--line-soft);
}

.mini-stat {
  @apply flex min-w-0 items-center justify-between gap-3;
}

.mini-label {
  @apply whitespace-nowrap text-sm;
  color: var(--text-mid);
}

.mini-value {
  @apply whitespace-nowrap text-sm font-semibold;
  color: var(--text-high);
}
</style>
