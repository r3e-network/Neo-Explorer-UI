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
defineOptions({ name: "HomePage" });

import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import SearchBox from "@/components/common/SearchBox.vue";
import HomeStats from "./components/HomeStats.vue";
import LatestBlocks from "./components/LatestBlocks.vue";
import LatestTransactions from "./components/LatestTransactions.vue";
import { blockService, transactionService, searchService, indexerReadService } from "@/services";
import { usePriceCache } from "@/composables/usePriceCache";
import { resolveSearchLocation } from "@/utils/searchRouting";
import { resolveSearchResultWithTimeout } from "@/utils/searchLookup";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { useTransferSummary } from "@/composables/useTransferSummary";
import { useCommittee } from "@/composables/useCommittee";

const router = useRouter();
const { fetchPrices } = usePriceCache();
const { transferSummaryByHash, enrichTransactions } = useTransferSummary();
const { loadCommittee } = useCommittee();

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
const HOMEPAGE_REFRESH_INTERVAL_MS = 3_000;
const blockDetailsByHash = new Map();

function isFreshHomepageSummary(summary) {
  if (!summary || typeof summary !== "object") return false;

  const totalBlocks = Number(summary.total_block_count ?? summary.last_indexed_block ?? 0);
  const lagBlocks = Number(summary.lag_blocks ?? summary.lagBlocks ?? Number.POSITIVE_INFINITY);
  const freshnessSeconds = Number(
    summary.freshness_seconds ?? summary.freshnessSeconds ?? Number.POSITIVE_INFINITY,
  );

  return (
    Number.isFinite(totalBlocks) &&
    totalBlocks > 0 &&
    Number.isFinite(lagBlocks) &&
    lagBlocks <= 2 &&
    Number.isFinite(freshnessSeconds) &&
    freshnessSeconds <= 30
  );
}

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

function hasSameOrderedTransactions(currentList = [], nextList = []) {
  if (!hasSameOrderedHashes(currentList, nextList)) return false;

  for (let index = 0; index < currentList.length; index += 1) {
    const current = currentList[index] || {};
    const next = nextList[index] || {};

    const currentVmState = String(current.vmstate || current.vm_state || "")
      .trim()
      .toUpperCase();
    const nextVmState = String(next.vmstate || next.vm_state || "")
      .trim()
      .toUpperCase();
    if (currentVmState !== nextVmState) return false;

    const currentStatus = String(current.status || "")
      .trim()
      .toLowerCase();
    const nextStatus = String(next.status || "")
      .trim()
      .toLowerCase();
    if (currentStatus !== nextStatus) return false;

    const currentTime = Number(current.blocktime ?? current.timestamp ?? current.time ?? 0);
    const nextTime = Number(next.blocktime ?? next.timestamp ?? next.time ?? 0);
    if (currentTime !== nextTime) return false;
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
  const index = Number(block.index ?? block.blockindex ?? block.block_index ?? block.height ?? 0);
  const txCount = Number(
    block.txcount ??
      block.transactioncount ??
      block.txCount ??
      block.transactionCount ??
      block.tx_count ??
      block.transaction_count ??
      block.txs ??
      (Array.isArray(block.tx) ? block.tx.length : 0),
  );
  const timestamp = Number(block.timestamp ?? block.blocktime ?? block.time ?? block.time_ms ?? 0);

  return {
    ...block,
    hash: block.hash || block.blockhash || "",
    index: Number.isFinite(index) ? index : 0,
    timestamp: Number.isFinite(timestamp) ? timestamp : 0,
    txcount: Number.isFinite(txCount) ? txCount : 0,
    transactioncount: Number.isFinite(txCount) ? txCount : 0,
    primary: block.primary ?? block.primary_node,
    netfee: block.netfee ?? block.networkFee ?? block.net_fee ?? block.totalNetFee,
    sysfee: block.sysfee ?? block.systemFee ?? block.sys_fee ?? block.totalSysFee,
    tx: block.tx || [],
    nextconsensus:
      block.nextconsensus ?? block.nextConsensus ?? block.next_consensus ?? block.speaker ?? block.validator,
    speaker: block.speaker ?? block.nextconsensus ?? block.nextConsensus ?? block.validator,
    validator: block.validator ?? block.speaker ?? block.nextconsensus ?? block.nextConsensus,
  };
}

function normalizeHomepageTransaction(tx = {}) {
  return {
    ...tx,
    hash: tx.hash || tx.txid || "",
    blocktime: tx.blocktime ?? tx.timestamp ?? tx.block_time_ms ?? tx.time_ms ?? 0,
    sender: tx.sender || tx.sender_address || "",
    sysfee: tx.sysfee ?? tx.sys_fee ?? 0,
    netfee: tx.netfee ?? tx.net_fee ?? 0,
    validUntilBlock: tx.validUntilBlock ?? tx.valid_until_block,
    contractHash: tx.contractHash || tx.contract_hash || "",
    vmstate: tx.vmstate || tx.vm_state || "",
    status: tx.status || (String(tx.vmstate || tx.vm_state || "").toUpperCase() === "HALT" ? "success" : ""),
  };
}

function computeBlockFeeTotals(block = {}) {
  const directSysFee = Number(block.sysfee ?? block.systemFee ?? block.sys_fee ?? block.totalSysFee);
  const directNetFee = Number(block.netfee ?? block.networkFee ?? block.net_fee ?? block.totalNetFee);
  const txList = Array.isArray(block.tx) ? block.tx : [];
  const txCount = Number(
    block.txcount ??
      block.transactioncount ??
      block.txCount ??
      block.transactionCount ??
      block.tx_count ??
      block.transaction_count ??
      txList.length,
  );

  const hasDirectSysFee = Number.isFinite(directSysFee);
  const hasDirectNetFee = Number.isFinite(directNetFee);
  const shouldUseTxFallback =
    txList.length > 0 &&
    txCount > 0 &&
    (!hasDirectSysFee || !hasDirectNetFee || (directSysFee === 0 && directNetFee === 0));

  if (!shouldUseTxFallback) {
    return {
      sysfee: hasDirectSysFee ? directSysFee : undefined,
      netfee: hasDirectNetFee ? directNetFee : undefined,
    };
  }

  return txList.reduce(
    (sum, tx) => ({
      sysfee: sum.sysfee + Number(tx?.sysfee ?? tx?.systemFee ?? tx?.sys_fee ?? 0),
      netfee: sum.netfee + Number(tx?.netfee ?? tx?.networkFee ?? tx?.net_fee ?? 0),
    }),
    { sysfee: 0, netfee: 0 },
  );
}

// Data loading
async function loadData() {
  blocksLoading.value = true;
  txsLoading.value = true;

  // Prices are external and lightweight; keep non-blocking.
  void loadPrices();

  try {
    // Force first-load freshness so session-restored SWR cache never shows minutes-old head data.
    await loadLatestData(true);
  } catch (err) {
    if (import.meta.env.DEV) console.error("Failed to load homepage data:", err);
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

    const requestOptions = { forceRefresh };
    // Single fast path: indexer summary + blocks + transactions in parallel.
    const summaryPromise = indexerReadService.getSummary(requestOptions).catch(() => null);

    // Single server — fetch directly from indexer, one fallback to RPC.
    const fetchLatestBlocks = async () => {
      try {
        const indexerRes = await indexerReadService.getBlocks(6, 0, requestOptions);
        const rows = Array.isArray(indexerRes?.data) ? indexerRes.data.map(normalizeBlockSummary) : [];
        if (rows.length > 0) {
          const summary = await summaryPromise;
          return {
            result: rows,
            totalCount: Number(indexerRes?.paging?.total ?? summary?.total_block_count ?? rows.length),
          };
        }
      } catch {
        // single fallback to RPC
      }
      return blockService.getList(6, 0, { ...requestOptions, enrichMissingFields: true });
    };

    // Single server — fetch directly from indexer, one fallback to RPC.
    const fetchLatestTransactions = async () => {
      try {
        const indexerRes = await indexerReadService.getTransactions(6, 0, requestOptions);
        const rows = Array.isArray(indexerRes?.data) ? indexerRes.data.map(normalizeHomepageTransaction) : [];
        if (rows.length > 0) {
          const summary = await summaryPromise;
          return {
            result: rows,
            totalCount: Number(indexerRes?.paging?.total ?? summary?.total_tx_count ?? rows.length),
          };
        }
      } catch {
        // single fallback to RPC
      }
      try {
        const txListRes = await transactionService.getList(6, 0, requestOptions);
        const rows = Array.isArray(txListRes?.result) ? txListRes.result : [];
        return {
          result: rows,
          totalCount: Number(txListRes?.totalCount ?? rows.length),
        };
      } catch {
        return { result: [], totalCount: 0 };
      }
    };

    const blocksPromise = fetchLatestBlocks()
      .then((blocksRes) => {
        if (!blocksRes) return;
        const nextBlocks = (blocksRes?.result || []).map((rawBlock) => {
          const block = normalizeBlockSummary(rawBlock);
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

    void summaryPromise.then((summary) => {
      if (!summary || !isFreshHomepageSummary(summary)) return;
      blockCount.value = resolveLiveBlockHeight(Number(summary.total_block_count || 0));
      txCount.value = Number(summary.total_tx_count || 0);
    }).catch(() => {});

    const fastTxsPromise = (async () => {
      const previousRows = Array.isArray(latestTxs.value) ? latestTxs.value : [];
      const previousConfirmedRows = previousRows.filter((tx) => tx?.status !== "pending");
      let confirmedRows = [];
      try {
        const txsRes = await fetchLatestTransactions();
        confirmedRows = Array.isArray(txsRes?.result) ? txsRes.result : [];
      } catch (err) {
        if (previousRows.length) {
          if (!hasSameOrderedTransactions(latestTxs.value, previousRows)) {
            latestTxs.value = previousRows;
          }
          return;
        }
        throw err;
      }

      // Keep list continuity during transient sparse RPC responses.
      const initialRows = mergeUniqueTransactions(confirmedRows, previousConfirmedRows, 6);
      if (!initialRows.length && previousRows.length) {
        if (!hasSameOrderedTransactions(latestTxs.value, previousRows)) {
          latestTxs.value = previousRows;
        }
        return;
      }

      if (!hasSameOrderedTransactions(latestTxs.value, initialRows)) {
        latestTxs.value = initialRows;
      }
      if (initialRows.length) {
        const nonPendingInitial = initialRows.filter((tx) => tx.status !== "pending");
        if (nonPendingInitial.length) {
          void enrichTransactions(nonPendingInitial, { maxItems: 6 });
        }
      }

      // Live homepage snapshot removed — single server, indexer is the source of truth.
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
    const txCount = Number(block.txcount ?? block.transactioncount ?? 0);
    const currentSysFee = Number(block.sysfee ?? block.systemFee);
    const currentNetFee = Number(block.netfee ?? block.networkFee);
    const missingFees =
      (block.sysfee === undefined && block.systemFee === undefined) ||
      (Number.isFinite(currentSysFee) && currentSysFee === 0 && txCount > 0);
    const missingNetFee =
      (block.netfee === undefined && block.networkFee === undefined) ||
      (Number.isFinite(currentNetFee) && currentNetFee === 0 && txCount > 0);
    return missingConsensus || missingFees || missingNetFee || missingPrimary;
  });

  if (!missing.length) return;

  const hydratedEntries = await Promise.all(
    missing.map(async (block) => {
      try {
        const full = await blockService.getByHeight(block.index, requestOptions);
        if (!full) return null;

      let feeTotals = {
        sysfee: full.sysfee ?? full.systemFee ?? full.sys_fee ?? full.totalSysFee,
        netfee: full.netfee ?? full.networkFee ?? full.net_fee ?? full.totalNetFee,
      };

      const normalizedFeeTotals = {
        sysfee: Number(feeTotals.sysfee),
        netfee: Number(feeTotals.netfee),
      };

      const txCount = Number(block.txcount ?? block.transactioncount ?? 0);
      const shouldFetchTransactions =
        txCount > 0 &&
        (!Number.isFinite(normalizedFeeTotals.sysfee) ||
          !Number.isFinite(normalizedFeeTotals.netfee) ||
          (normalizedFeeTotals.sysfee === 0 && normalizedFeeTotals.netfee === 0));

      if (shouldFetchTransactions) {
        const txRes = await blockService.getTransactionsByHeight(block.index, txCount, 0, requestOptions);
        const txs = Array.isArray(txRes?.result) ? txRes.result : [];
        if (txs.length > 0) {
          full.tx = txs;
        }
      }

      return {
          hash: block.hash,
          details: {
            primary: full.primary,
            nextconsensus: full.nextconsensus ?? full.nextConsensus ?? full.speaker ?? full.validator,
            speaker: full.speaker ?? full.nextconsensus ?? full.nextConsensus ?? full.validator,
            validator: full.validator ?? full.speaker ?? full.nextconsensus ?? full.nextConsensus,
            ...computeBlockFeeTotals(full),
          },
        };
      } catch {
        return null;
      }
    }),
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
}, { intervalMs: HOMEPAGE_REFRESH_INTERVAL_MS });

function handleNetworkChange() {
  void loadCommittee(true);
  void loadLatestData(true);
  startAutoRefresh();
}

// Lifecycle
onMounted(() => {
  void loadCommittee();
  loadData();
  startAutoRefresh();
});

useNetworkChange(handleNetworkChange);

// Clean up network change listener (auto-refresh cleanup is handled by composable)
onBeforeUnmount(() => {});
</script>

<style scoped>
.hero-section {
  background-image:
    radial-gradient(circle at 15% 20%, rgba(74, 180, 238, 0.26), transparent 36%),
    radial-gradient(circle at 78% 8%, rgba(0, 229, 153, 0.16), transparent 28%),
    linear-gradient(180deg, #0f1f3d 0%, #162a4b 100%);
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
</style>
