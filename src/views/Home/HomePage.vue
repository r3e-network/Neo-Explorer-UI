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
        <LatestTransactions
          :transactions="latestTxs"
          :transfer-summary-by-hash="transferSummaryByHash"
          :loading="txsLoading"
          :error="txsError"
          @retry="loadLatestData"
        />
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
const { transferSummaryByHash, enrichTransactions } = useTransferSummary();

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
const TX_FALLBACK_BLOCK_SCAN_LIMIT = 24;
const blockDetailsByHash = new Map();

function getLatestKnownHeight() {
  const latestIndex = Number(latestBlocks.value?.[0]?.index);
  if (!Number.isFinite(latestIndex) || latestIndex < 0) return 0;
  return latestIndex + 1;
}

function resolveLiveBlockHeight(candidateHeight) {
  const candidate = Number(candidateHeight || 0);
  return Math.max(candidate, getLatestKnownHeight());
}

function extractHeightFromBlocks(blocks = []) {
  const latestIndex = Number(blocks?.[0]?.index);
  if (!Number.isFinite(latestIndex) || latestIndex < 0) return 0;
  return latestIndex + 1;
}

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

function mergeUniqueTransactions(primary = [], secondary = [], limit = 6) {
  const rows = [];
  const seen = new Set();

  const append = (items = []) => {
    for (const tx of items) {
      const hash = String(tx?.hash || "").trim();
      if (!hash || seen.has(hash)) continue;
      seen.add(hash);
      rows.push(tx);
      if (rows.length >= limit) return;
    }
  };

  append(primary);
  if (rows.length < limit) append(secondary);
  return rows;
}

function normalizeBlockSummary(block = {}) {
  const index = Number(block.index ?? block.blockindex ?? block.height ?? 0);
  const txCount = Number(
    block.txcount ??
    block.transactioncount ??
    block.txCount ??
    (Array.isArray(block.tx) ? block.tx.length : 0)
  );
  const timestamp = Number(block.timestamp ?? block.blocktime ?? block.time ?? 0);

  return {
    ...block,
    hash: block.hash || block.blockhash || "",
    index: Number.isFinite(index) ? index : 0,
    timestamp: Number.isFinite(timestamp) ? timestamp : 0,
    txcount: Number.isFinite(txCount) ? txCount : 0,
    transactioncount: Number.isFinite(txCount) ? txCount : 0,
    netfee: block.netfee ?? block.networkFee,
    sysfee: block.sysfee ?? block.systemFee,
    nextconsensus: block.nextconsensus ?? block.nextConsensus ?? block.speaker ?? block.validator,
    speaker: block.speaker ?? block.nextconsensus ?? block.nextConsensus ?? block.validator,
    validator: block.validator ?? block.speaker ?? block.nextconsensus ?? block.nextConsensus,
  };
}

async function fetchLatestBlocksByHeight(limit = 6, skip = 0, requestOptions = {}) {
  const maxItems = Math.max(1, Number(limit) || 6);
  const normalizedSkip = Math.max(0, Number(skip) || 0);
  const latestHeight = Number(await blockService.getCount({ ...requestOptions, throwOnError: false })) - 1;
  if (!Number.isFinite(latestHeight) || latestHeight < 0) {
    return { result: [], totalCount: 0 };
  }

  const startHeight = Math.max(0, latestHeight - normalizedSkip);
  const heights = [];
  for (let offset = 0; offset < maxItems && startHeight - offset >= 0; offset += 1) {
    heights.push(startHeight - offset);
  }

  const blockResults = await Promise.all(
    heights.map(async (height) => {
      const block = await blockService.getByHeight(height, { ...requestOptions, throwOnError: false });
      return block ? normalizeBlockSummary(block) : null;
    })
  );

  const result = blockResults.filter(Boolean);
  return { result, totalCount: latestHeight + 1 };
}

async function fetchLatestTransactionsByRecentBlocks(limit = 6, skip = 0, requestOptions = {}) {
  const maxItems = Math.max(1, Number(limit) || 6);
  let remainingSkip = Math.max(0, Number(skip) || 0);
  const latestHeight = Number(await blockService.getCount({ ...requestOptions, throwOnError: false })) - 1;

  if (!Number.isFinite(latestHeight) || latestHeight < 0) {
    return { result: [], totalCount: 0 };
  }

  const maxBlocksToScan = Math.max(TX_FALLBACK_BLOCK_SCAN_LIMIT, maxItems * 4);
  const txs = [];

  for (let offset = 0; offset < maxBlocksToScan && latestHeight - offset >= 0; offset += 1) {
    const height = latestHeight - offset;
    const listRes = await blockService.getTransactionsByHeight(height, maxItems + remainingSkip, 0, {
      ...requestOptions,
      throwOnError: false,
    });
    const rows = Array.isArray(listRes?.result) ? listRes.result : [];
    if (!rows.length) continue;

    let slicedRows = rows;
    if (remainingSkip > 0) {
      if (rows.length <= remainingSkip) {
        remainingSkip -= rows.length;
        continue;
      }
      slicedRows = rows.slice(remainingSkip);
      remainingSkip = 0;
    }

    txs.push(...slicedRows);
    if (txs.length >= maxItems) break;
  }

  return {
    result: txs.slice(0, maxItems),
    totalCount: txs.length,
  };
}

async function fetchPendingTransactionsSafe(limit = 20) {
  const pendingFetcher = transactionService?.getPendingTransactions;
  if (typeof pendingFetcher !== "function") {
    if (import.meta.env.DEV) {
      console.warn("transactionService.getPendingTransactions is unavailable; skipping mempool merge.");
    }
    return [];
  }

  try {
    return await pendingFetcher.call(transactionService, limit);
  } catch (err) {
    if (import.meta.env.DEV) console.warn("Pending tx fetch failed; continuing without mempool data:", err);
    return [];
  }
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
      const blocks = Number(fastStats?.blocks || 0);
      const txs = Number(fastStats?.txs || 0);

      // NeoTube can intermittently return empty counters while still returning HTTP 200.
      // Fall back to RPC dashboard stats in that case instead of showing zeroed values.
      if (blocks > 0 && txs > 0) {
        blockCount.value = resolveLiveBlockHeight(blocks);
        txCount.value = txs;
        lastStatsRefreshTime = Date.now();
        return;
      }

      if (import.meta.env.DEV) {
        console.warn("NeoTube stats contained empty counters, falling back to RPC stats:", fastStats);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn("NeoTube stats unavailable, falling back to RPC stats:", err);
    }
  }

  try {
    const stats = await statsService.getDashboardStats(forceRefresh);
    blockCount.value = resolveLiveBlockHeight(stats.blocks || 0);
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

      try {
        return await blockService.getList(6, 0, { ...requestOptions, enrichMissingFields: false });
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn("RPC latest block list unavailable, falling back to per-height fetch:", err);
        }
      }

      return fetchLatestBlocksByHeight(6, 0, requestOptions);
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

      try {
        return await transactionService.getList(6, 0, requestOptions);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn("RPC latest transaction list unavailable, falling back to per-block tx fetch:", err);
        }
      }

      return fetchLatestTransactionsByRecentBlocks(6, 0, requestOptions);
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

        const latestHeight = extractHeightFromBlocks(nextBlocks);
        if (latestHeight > 0) {
          blockCount.value = latestHeight;
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

    const fastTxsPromise = (async () => {
      const pendingPromise = fetchPendingTransactionsSafe(6)
        .then((rows) => (Array.isArray(rows) ? rows : []))
        .catch(() => []);

      let confirmedRows = [];
      try {
        const txsRes = await fetchLatestTransactions();
        confirmedRows = Array.isArray(txsRes?.result) ? txsRes.result : [];
      } catch (err) {
        const pendingOnly = mergeUniqueTransactions(await pendingPromise, [], 6);
        if (pendingOnly.length) {
          if (!hasSameOrderedHashes(latestTxs.value, pendingOnly)) {
            latestTxs.value = pendingOnly;
          }
          return;
        }
        throw err;
      }

      const initialRows = mergeUniqueTransactions(confirmedRows, [], 6);
      if (!hasSameOrderedHashes(latestTxs.value, initialRows)) {
        latestTxs.value = initialRows;
      }
      if (initialRows.length) {
        const nonPendingInitial = initialRows.filter((tx) => tx.status !== "pending");
        if (nonPendingInitial.length) {
          void enrichTransactions(nonPendingInitial, { maxItems: 6 });
        }
      }

      // Merge pending transactions when ready without blocking initial confirmed tx rendering.
      void pendingPromise.then((pendingRows) => {
        const mergedRows = mergeUniqueTransactions(pendingRows, confirmedRows, 6);
        if (!mergedRows.length || hasSameOrderedHashes(latestTxs.value, mergedRows)) return;
        latestTxs.value = mergedRows;
      });
    })()
      .catch((err) => {
        if (import.meta.env.DEV) console.warn("txs load err:", err);
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
  
  let newestTime = newest.timestamp || 0;
  let oldestTime = oldest.timestamp || 0;
  if (newestTime > 1e10) newestTime /= 1000;
  if (oldestTime > 1e10) oldestTime /= 1000;
  
  const timeDiff = Math.max(1, newestTime - oldestTime);
  const totalTxs = latestBlocks.value.reduce((sum, b) => sum + (b.txcount || b.transactioncount || 0), 0);
  tps.value = totalTxs / timeDiff;
}

async function hydrateLatestBlocks(blocks = [], requestOptions = {}) {
  const missing = blocks.filter((block) => {
    if (!block?.hash || blockDetailsByHash.has(block.hash)) return false;
    const missingConsensus = !block.nextconsensus && !block.nextConsensus && !block.speaker && !block.validator;
    const missingPrimary = block.primary === undefined;
    const missingFees = block.sysfee === undefined && block.systemFee === undefined;
    const missingNetFee = block.netfee === undefined && block.networkFee === undefined;
    return missingConsensus || missingFees || missingNetFee || missingPrimary;
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
