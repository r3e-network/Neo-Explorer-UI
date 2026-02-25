<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero-section relative border-b border-white/10 bg-header-bg/95">
      <div class="hero-overlay"></div>
      <div class="page-container relative z-30 py-10 md:py-14">
        <div v-once class="mx-auto max-w-3xl text-center">
          <h1 class="text-balance text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            The Neo N3 Blockchain Explorer
          </h1>
          <p class="mt-2 text-sm text-white/70">Search transactions, blocks, addresses, tokens and more on Neo N3</p>
          <div class="relative z-30 mt-6">
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
      :latest-block-timestamp="latestBlocks[0]?.timestamp"
      :tps="tps"
      @fetch-latest="handleFetchLatest"
    />

    <!-- Latest Blocks + Latest Transactions -->
    <section class="page-shell">
      <div class="page-container py-1">
      <div class="grid gap-4 lg:grid-cols-2">
        <LatestBlocks :blocks="latestBlocks" :loading="blocksLoading" :error="blocksError" @retry="loadLatestData" />
        <LatestTransactions :transactions="latestTxs" :loading="txsLoading" :error="txsError" @retry="loadLatestData" />
      </div>
      </div>
    </section>
  </div>
</template>

<script setup>
defineOptions({ name: 'HomePage' });

import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import SearchBox from "@/components/common/SearchBox.vue";
import HomeStats from "./components/HomeStats.vue";
import LatestBlocks from "./components/LatestBlocks.vue";
import LatestTransactions from "./components/LatestTransactions.vue";
import { statsService, blockService, transactionService, searchService, neotubeService } from "@/services";
import { usePriceCache } from "@/composables/usePriceCache";
import { resolveSearchLocation } from "@/utils/searchRouting";
import { resolveSearchResultWithTimeout } from "@/utils/searchLookup";
import { NETWORK_CHANGE_EVENT, getCurrentEnv } from "@/utils/env";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { useTransferSummary } from "@/composables/useTransferSummary";

const router = useRouter();
const { fetchPrices } = usePriceCache();

// State
const blocksLoading = ref(true);
const txsLoading = ref(true);
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
let lastFetchLatestTime = 0;
let lastStatsRefreshTime = 0;
const STATS_REFRESH_INTERVAL_MS = 60_000;
const blockDetailsByHash = new Map();

function handleFetchLatest() {
  const now = Date.now();
  // Throttle aggressively when overdue, to prevent spamming the node
  // only fetch once every 3 seconds while waiting for a late block
  if (now - lastFetchLatestTime > 3000) {
    lastFetchLatestTime = now;
    loadLatestData(true);
  }
}

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
  blocksLoading.value = true;
  txsLoading.value = true;

  // Prices are external and lightweight; keep non-blocking.
  void loadPrices();

  try {
    await loadLatestData();
  } catch (err) {
    if (import.meta.env.DEV) console.error("Failed to load homepage data:", err);
  }

  // Defer heavy dashboard stats until latest blocks/transactions are rendered.
  void loadStats();
}

async function loadStats(forceRefresh = false) {
  const env = getCurrentEnv();

  if (neotubeService.supportsNetwork(env)) {
    try {
      const fastStats = await neotubeService.getStatistics(env);
      blockCount.value = fastStats.blocks || 0;
      txCount.value = fastStats.txs || 0;
      lastStatsRefreshTime = Date.now();
      return;
    } catch (err) {
      if (import.meta.env.DEV) console.warn("NeoTube stats unavailable, falling back to RPC stats:", err);
    }
  }

  try {
    const stats = await statsService.getDashboardStats(forceRefresh);
    blockCount.value = stats.blocks || 0;
    txCount.value = stats.txs || 0;
    lastStatsRefreshTime = Date.now();
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
    blocksLoading.value = true;
    txsLoading.value = true;

    const env = getCurrentEnv();
    const requestOptions = { forceRefresh };

    const fetchLatestBlocks = async () => {
      if (neotubeService.supportsNetwork(env)) {
        try {
          return await neotubeService.getLatestBlocks(6, 0, env);
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn("NeoTube latest blocks unavailable, falling back to RPC list:", err);
          }
        }
      }

      return blockService.getList(6, 0, { ...requestOptions, enrichMissingFields: false });
    };

    const fetchLatestTransactions = async () => {
      if (neotubeService.supportsNetwork(env)) {
        try {
          return await neotubeService.getLatestTransactions(6, 0, env);
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn("NeoTube latest transactions unavailable, falling back to RPC list:", err);
          }
        }
      }

      return transactionService.getList(6, 0, requestOptions);
    };

    const blocksPromise = fetchLatestBlocks()
      .then((blocksRes) => {
        if (!blocksRes) return;
        const nextBlocks = (blocksRes?.result || []).map((block) => {
          const cachedDetails = blockDetailsByHash.get(block.hash);
          return cachedDetails ? { ...block, ...cachedDetails } : block;
        });
        if (!hasSameOrderedHashes(latestBlocks.value, nextBlocks)) {
          latestBlocks.value = nextBlocks;
        }

        updateTps();
        void hydrateLatestBlocks(nextBlocks, requestOptions);
      })
      .catch(() => {
        blocksError.value = true;
      })
      .finally(() => {
        blocksLoading.value = false;
      });

    const fastTxsPromise = fetchLatestTransactions()
      .then((txsRes) => {
        if (!txsRes) return;
        const nextTxs = txsRes?.result || [];
        if (!hasSameOrderedHashes(latestTxs.value, nextTxs)) {
          latestTxs.value = nextTxs;
        }
      })
      .catch(() => {
        txsError.value = true;
      })
      .finally(() => {
        txsLoading.value = false;
      });

    await Promise.allSettled([blocksPromise, fastTxsPromise]);
  } catch (err) {
    if (import.meta.env.DEV) console.warn("Failed to load latest blocks/transactions:", err);
  } finally {
    isRefreshing = false;
  }
}

function updateTps() {
  if (latestBlocks.value.length < 2) {
    tps.value = 0;
    return;
  }

  const newest = latestBlocks.value[0];
  const oldest = latestBlocks.value[latestBlocks.value.length - 1];
  let timeDiff = (newest.timestamp || 0) - (oldest.timestamp || 0);
  if (timeDiff > 1e10) timeDiff = timeDiff / 1000;
  const totalTxs = latestBlocks.value.reduce((sum, b) => sum + (b.txcount || b.transactioncount || 0), 0);
  tps.value = timeDiff > 0 ? totalTxs / timeDiff : 0;
}

async function hydrateLatestBlocks(blocks = [], requestOptions = {}) {
  const missing = blocks.filter((block) => {
    if (!block?.hash || blockDetailsByHash.has(block.hash)) return false;
    const missingConsensus = !block.nextconsensus && !block.nextConsensus && !block.speaker && !block.validator;
    const missingFees = block.sysfee === undefined && block.systemFee === undefined;
    const missingNetFee = block.netfee === undefined && block.networkFee === undefined;
    return missingConsensus || missingFees || missingNetFee;
  });

  if (!missing.length) return;

  const hydratedEntries = await Promise.all(
    missing.map(async (block) => {
      try {
        const full = await blockService.getByHeight(block.index, requestOptions);
        if (!full) return null;

        return {
          hash: block.hash,
          details: {
            primary: full.primary,
            nextconsensus: full.nextconsensus ?? full.nextConsensus ?? full.speaker ?? full.validator,
            speaker: full.speaker ?? full.nextconsensus ?? full.nextConsensus ?? full.validator,
            validator: full.validator ?? full.speaker ?? full.nextconsensus ?? full.nextConsensus,
            sysfee: full.sysfee ?? full.systemFee,
            netfee: full.netfee ?? full.networkFee,
          },
        };
      } catch {
        return null;
      }
    })
  );

  const validEntries = hydratedEntries.filter((entry) => entry && entry.hash);
  if (!validEntries.length) return;

  for (const entry of validEntries) {
    blockDetailsByHash.set(entry.hash, entry.details);
  }

  latestBlocks.value = latestBlocks.value.map((block) => {
    const details = blockDetailsByHash.get(block.hash);
    return details ? { ...block, ...details } : block;
  });
  updateTps();
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
    const result = await resolveSearchResultWithTimeout((q) => searchService.search(q), query);
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
  void loadLatestData(true);
  const now = Date.now();
  if (now - lastStatsRefreshTime >= STATS_REFRESH_INTERVAL_MS) {
    void loadStats(true);
  }
});

function handleNetworkChange() {
  void loadLatestData(true);
  void loadStats(true);
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
  overflow: hidden;
  background-image: linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 26px 26px;
  opacity: 0.28;
}
</style>
