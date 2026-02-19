<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero-section relative overflow-hidden border-b border-white/10 bg-header-bg/95">
      <div class="hero-overlay"></div>
      <div class="page-container relative z-10 py-10 md:py-14">
        <div v-once class="mx-auto max-w-3xl text-center">
          <h1 class="text-balance text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            The Neo N3 Blockchain Explorer
          </h1>
          <p class="mt-2 text-sm text-white/70">Search transactions, blocks, addresses, tokens and more on Neo N3</p>
          <div class="mt-6">
            <SearchBox mode="full" :loading="searchLoading" @search="handleSearch" />
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Cards (overlapping hero) -->
    <HomeStats
      :neo-price="neoPrice"
      :gas-price="gasPrice"
      :neo-price-change="neoPriceChange"
      :gas-price-change="gasPriceChange"
      :market-cap="marketCap"
      :tx-count="txCount"
      :block-count="blockCount"
      :tps="tps"
    />

    <!-- Latest Blocks + Latest Transactions -->
    <section class="page-shell">
      <div class="page-container py-1">
      <div class="grid gap-4 lg:grid-cols-2">
        <LatestBlocks :blocks="latestBlocks" :loading="loading" :error="blocksError" @retry="loadLatestData" />
        <LatestTransactions :transactions="latestTxs" :loading="loading" :error="txsError" @retry="loadLatestData" />
      </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import SearchBox from "@/components/common/SearchBox.vue";
import HomeStats from "./components/HomeStats.vue";
import LatestBlocks from "./components/LatestBlocks.vue";
import LatestTransactions from "./components/LatestTransactions.vue";
import { statsService, blockService, transactionService, searchService } from "@/services";
import { usePriceCache } from "@/composables/usePriceCache";
import { resolveSearchLocation } from "@/utils/searchRouting";
import { NETWORK_CHANGE_EVENT } from "@/utils/env";
import { useAutoRefresh } from "@/composables/useAutoRefresh";

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
let isRefreshing = false;

function hasSameOrderedHashes(currentList = [], nextList = []) {
  if (currentList.length !== nextList.length) return false;

  for (let index = 0; index < currentList.length; index += 1) {
    if ((currentList[index]?.hash || "") !== (nextList[index]?.hash || "")) {
      return false;
    }
  }

  return true;
}

// Data loading
async function loadData() {
  loading.value = true;
  try {
    await Promise.allSettled([loadStats(), loadLatestData(), loadPrices()]);
  } catch (err) {
    if (import.meta.env.DEV) console.error("Failed to load homepage data:", err);
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
    if (import.meta.env.DEV) console.warn("Failed to load dashboard stats:", err);
  }
}

async function loadLatestData(forceRefresh = false) {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    blocksError.value = false;
    txsError.value = false;

    const [blocksRes, txsRes] = await Promise.all([
      blockService.getList(6, 0, { forceRefresh }).catch(() => {
        blocksError.value = true;
        return null;
      }),
      transactionService.getList(6, 0, { forceRefresh }).catch(() => {
        txsError.value = true;
        return null;
      }),
    ]);

    if (blocksRes) {
      const nextBlocks = blocksRes?.result || [];
      if (!hasSameOrderedHashes(latestBlocks.value, nextBlocks)) {
        latestBlocks.value = nextBlocks;
      }
    }

    if (txsRes) {
      const nextTxs = txsRes?.result || [];
      if (!hasSameOrderedHashes(latestTxs.value, nextTxs)) {
        latestTxs.value = nextTxs;
      }
    }

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
    if (import.meta.env.DEV) console.warn("Failed to load latest blocks/transactions:", err);
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
    if (location) router.push(location).catch(() => {});
  } catch (err) {
    if (import.meta.env.DEV) console.warn("Search failed, using fallback routing:", err);
    const fallback = resolveSearchLocation(query, null);
    if (fallback) router.push(fallback).catch(() => {});
  } finally {
    searchLoading.value = false;
  }
}

// Auto-refresh via composable (handles cleanup + visibility pause)
const { start: startAutoRefresh } = useAutoRefresh(() => {
  loadLatestData(true);
});

function handleNetworkChange() {
  loadLatestData(true);
  loadStats();
  startAutoRefresh();
}

// Lifecycle
onMounted(() => {
  loadData();
  startAutoRefresh();
  window.addEventListener(NETWORK_CHANGE_EVENT, handleNetworkChange);
});

// Clean up network change listener (auto-refresh cleanup is handled by composable)
onBeforeUnmount(() => {
  window.removeEventListener(NETWORK_CHANGE_EVENT, handleNetworkChange);
});
</script>

<style scoped>
.hero-section {
  background-image: radial-gradient(circle at 15% 20%, rgba(74, 180, 238, 0.26), transparent 36%),
    radial-gradient(circle at 78% 8%, rgba(0, 229, 153, 0.16), transparent 28%),
    linear-gradient(180deg, #0f1f3d 0%, #162a4b 100%);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 26px 26px;
  opacity: 0.28;
}
</style>
