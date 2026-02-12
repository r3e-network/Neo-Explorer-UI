<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero-section bg-header-bg relative overflow-hidden">
      <div class="hero-overlay"></div>
      <div class="mx-auto max-w-[1400px] px-4 py-10 md:py-14 relative z-10">
        <div class="mx-auto max-w-3xl text-center">
          <h1 class="text-3xl font-bold text-white md:text-4xl">The Neo N3 Blockchain Explorer</h1>
          <p class="mt-2 text-sm text-white/60">Search transactions, blocks, addresses, tokens and more on Neo N3</p>
          <div class="mt-6">
            <SearchBox mode="full" :loading="searchLoading" @search="handleSearch" />
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Cards (overlapping hero) -->
    <section class="mx-auto -mt-8 max-w-[1400px] px-4 relative z-20">
      <div class="etherscan-card p-4 md:p-5">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <!-- NEO Price -->
          <div class="stat-block">
            <div class="flex items-center gap-2">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
                <svg
                  class="h-4 w-4 text-primary-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <div class="stat-label">NEO Price</div>
                <div class="stat-value">${{ formatPrice(neoPrice) }}</div>
              </div>
            </div>
            <div class="mt-1 text-xs" :class="priceChangeClass(neoPriceChange)">
              {{ formatPriceChange(neoPriceChange) }} <span class="text-text-secondary dark:text-gray-500">(24h)</span>
            </div>
          </div>

          <!-- GAS Price -->
          <div class="stat-block">
            <div class="flex items-center gap-2">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <svg
                  class="h-4 w-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <div class="stat-label">GAS Price</div>
                <div class="stat-value">${{ formatPrice(gasPrice) }}</div>
              </div>
            </div>
            <div class="mt-1 text-xs" :class="priceChangeClass(gasPriceChange)">
              {{ formatPriceChange(gasPriceChange) }} <span class="text-text-secondary dark:text-gray-500">(24h)</span>
            </div>
          </div>

          <!-- Transactions -->
          <div class="stat-block">
            <div class="flex items-center gap-2">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <svg
                  class="h-4 w-4 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div>
                <div class="stat-label">Transactions</div>
                <div class="stat-value">{{ formatLargeNumber(txCount) }}</div>
              </div>
            </div>
            <div class="mt-1 text-xs text-text-secondary dark:text-gray-400">{{ tps.toFixed(2) }} TPS</div>
          </div>

          <!-- Block Height -->
          <div class="stat-block">
            <div class="flex items-center gap-2">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <svg
                  class="h-4 w-4 text-purple-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <div>
                <div class="stat-label">Block Height</div>
                <div class="stat-value">{{ formatNumber(blockCount) }}</div>
              </div>
            </div>
            <div class="mt-1 text-xs text-text-secondary dark:text-gray-400">~15s finality (dBFT)</div>
          </div>
        </div>

        <!-- Secondary stats row -->
        <div class="mt-4 border-t border-card-border pt-4 dark:border-card-border-dark">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="mini-stat">
              <span class="mini-label">Market Cap</span>
              <span class="mini-value">${{ formatLargeNumber(marketCap) }}</span>
            </div>
            <div class="mini-stat">
              <span class="mini-label">Last Finalized Block</span>
              <router-link to="/blocks/1" class="mini-value-link etherscan-link">{{ formatNumber(blockCount) }}</router-link>
            </div>
            <div class="mini-stat">
              <span class="mini-label">Network Fee</span>
              <span class="mini-value">{{ networkFeeDisplay }} GAS</span>
            </div>
            <div class="mini-stat">
              <span class="mini-label">Est. Fee Cost</span>
              <span class="mini-value">~${{ gasCostUsd }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Latest Blocks + Latest Transactions -->
    <section class="mx-auto max-w-[1400px] px-4 py-5 md:py-6">
      <div class="grid gap-4 lg:grid-cols-2">
        <!-- Latest Blocks -->
        <article class="etherscan-card overflow-hidden">
          <header class="card-header">
            <h2 class="text-base font-semibold text-text-primary dark:text-gray-100">Latest Blocks</h2>
            <router-link to="/blocks/1" class="btn-outline text-xs">View all</router-link>
          </header>

          <div v-if="loading" class="space-y-2 p-4">
            <Skeleton v-for="i in 6" :key="i" height="54px" />
          </div>
          <div v-else-if="blocksError" class="p-4">
            <ErrorState
              title="Unable to load latest blocks"
              message="Please try again in a moment."
              @retry="loadLatestData"
            />
          </div>
          <div v-else-if="!latestBlocks.length" class="p-4">
            <EmptyState message="No blocks found" />
          </div>
          <div v-else>
            <BlockListItem v-for="block in latestBlocks" :key="block.hash" :block="block" />
          </div>
        </article>

        <!-- Latest Transactions -->
        <article class="etherscan-card overflow-hidden">
          <header class="card-header">
            <h2 class="text-base font-semibold text-text-primary dark:text-gray-100">Latest Transactions</h2>
            <router-link to="/transactions/1" class="btn-outline text-xs">View all</router-link>
          </header>

          <div v-if="loading" class="space-y-2 p-4">
            <Skeleton v-for="i in 6" :key="i" height="54px" />
          </div>
          <div v-else-if="txsError" class="p-4">
            <ErrorState
              title="Unable to load latest transactions"
              message="Please try again in a moment."
              @retry="loadLatestData"
            />
          </div>
          <div v-else-if="!latestTxs.length" class="p-4">
            <EmptyState message="No transactions found" />
          </div>
          <div v-else>
            <TxListItem v-for="tx in latestTxs" :key="tx.hash" :tx="tx" />
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import BlockListItem from "@/components/common/BlockListItem.vue";
import TxListItem from "@/components/common/TxListItem.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import SearchBox from "@/components/common/SearchBox.vue";
import { statsService, blockService, transactionService, searchService } from "@/services";
import { usePriceCache } from "@/composables/usePriceCache";
import { resolveSearchLocation } from "@/utils/searchRouting";
import {
  formatNumber,
  formatPrice,
  formatPriceChange,
  priceChangeClass,
  formatLargeNumber,
} from "@/utils/explorerFormat";
import { HOME_REFRESH_INTERVAL } from "@/constants";

const router = useRouter();
const { fetchPrices } = usePriceCache();

// State
const loading = ref(true);
const searchLoading = ref(false);
const blocksError = ref(false);
const txsError = ref(false);
const blockCount = ref(0);
const txCount = ref(0);
const latestBlocks = ref([]);
const latestTxs = ref([]);
const neoPrice = ref(0);
const gasPrice = ref(0);
const neoPriceChange = ref(0);
const gasPriceChange = ref(0);
const marketCap = ref(0);
const tps = ref(0);
let refreshInterval = null;
let isRefreshing = false;

// Computed
const networkFeeDisplay = computed(() => {
  const price = Number(gasPrice.value) || 0;
  return Math.max(0, price * 0.08).toFixed(3);
});

const gasCostUsd = computed(() => {
  const price = Number(gasPrice.value) || 0;
  return (price * 0.02).toFixed(2);
});

// Data loading
async function loadData() {
  loading.value = true;
  try {
    await Promise.all([loadStats(), loadLatestData(), loadPrices()]);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("Failed to load homepage data:", err);
  } finally {
    loading.value = false;
  }
}

async function loadStats() {
  try {
    const stats = await statsService.getDashboardStats();
    blockCount.value = stats.blocks || 0;
    txCount.value = stats.txs || 0;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.warn("Failed to load dashboard stats:", err);
  }
}

async function loadLatestData() {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    blocksError.value = false;
    txsError.value = false;

    const [blocksRes, txsRes] = await Promise.all([
      blockService.getList(6, 0).catch(() => {
        blocksError.value = true;
        return null;
      }),
      transactionService.getList(6, 0).catch(() => {
        txsError.value = true;
        return null;
      }),
    ]);

    if (blocksRes) latestBlocks.value = blocksRes?.result || [];
    if (txsRes) latestTxs.value = txsRes?.result || [];

    // Calculate TPS from latest blocks
    if (latestBlocks.value.length >= 2) {
      const newest = latestBlocks.value[0];
      const oldest = latestBlocks.value[latestBlocks.value.length - 1];
      let timeDiff = (newest.timestamp || 0) - (oldest.timestamp || 0);
      if (timeDiff > 1e10) timeDiff = timeDiff / 1000;
      const totalTxs = latestBlocks.value.reduce((sum, b) => sum + (b.txcount || 0), 0);
      tps.value = timeDiff > 0 ? totalTxs / timeDiff : 0;
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.warn("Failed to load latest blocks/transactions:", err);
  } finally {
    isRefreshing = false;
  }
}

async function loadPrices() {
  const data = await fetchPrices();
  neoPrice.value = data.neo;
  gasPrice.value = data.gas;
  neoPriceChange.value = data.neoChange;
  gasPriceChange.value = data.gasChange;
  marketCap.value = data.marketCap;
}

// Search
async function handleSearch(inputValue) {
  const query = (inputValue || "").trim();
  if (!query) return;

  searchLoading.value = true;
  try {
    const result = await searchService.search(query);
    const location = resolveSearchLocation(query, result);
    if (location) router.push(location);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.warn("Search failed, using fallback routing:", err);
    const fallback = resolveSearchLocation(query, null);
    if (fallback) router.push(fallback);
  } finally {
    searchLoading.value = false;
  }
}

// Lifecycle
onMounted(() => {
  loadData();
  refreshInterval = setInterval(loadLatestData, HOME_REFRESH_INTERVAL);
});

onBeforeUnmount(() => {
  if (refreshInterval) clearInterval(refreshInterval);
});
</script>

<style scoped>
.hero-section {
  background-image: radial-gradient(circle at 15% 20%, rgba(56, 189, 248, 0.12), transparent 36%),
    radial-gradient(circle at 80% 10%, rgba(56, 189, 248, 0.15), transparent 30%),
    linear-gradient(180deg, #21325b 0%, #2a3f6e 100%);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 26px 26px;
  opacity: 0.35;
}

.stat-block {
  @apply rounded-lg border border-card-border p-3 dark:border-card-border-dark;
}

.mini-stat {
  @apply flex items-center justify-between;
}

.mini-label {
  @apply text-sm text-text-secondary dark:text-gray-400;
}

.mini-value {
  @apply text-sm font-semibold text-text-primary dark:text-gray-200;
}

.mini-value-link {
  @apply text-sm font-semibold text-text-primary hover:text-primary-500 dark:text-gray-200 dark:hover:text-primary-400;
}
</style>
