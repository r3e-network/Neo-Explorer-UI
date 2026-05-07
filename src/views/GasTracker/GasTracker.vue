<template>
  <div class="gas-tracker-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <!-- Breadcrumb -->
      <Breadcrumb :items="[{ label: $t('breadcrumb.home'), to: '/homepage' }, { label: $t('breadcrumb.gasTracker') }]" />

      <!-- Page Header -->
      <div class="mb-6 flex items-center gap-3">
        <div class="page-header-icon bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h1 class="page-title">{{ $t("gasTracker.pageTitle") }}</h1>
          <p class="page-subtitle">
            {{ $t("gasTracker.pageSubtitle") }}
            <span v-if="autoRefreshActive" class="ml-2 inline-flex items-center gap-1 text-xs text-green-500">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
              {{ $t("gasTracker.live") }}
            </span>
          </p>
        </div>
      </div>

      <!-- Fee Estimate Cards -->
      <FeeEstimateCards :feeEstimates="feeEstimates" :loading="loading" />

      <!-- Latest Fee Summary -->
      <div v-if="gasError" class="etherscan-card mb-6 p-5">
        <div class="flex items-center gap-3 text-sm text-mid">
          <svg class="h-5 w-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>
          <span>{{ $t("gasTracker.summaryUnavailable") }}</span>
          <button @click="loadGasTracker(true)" class="ml-auto text-primary-500 hover:text-primary-600 font-medium text-xs underline">{{ $t('common.retry') }}</button>
        </div>
      </div>
      <FeeSummary v-else :gasData="gasData" />

      <!-- Fee Trend Chart -->
      <FeeTrendChart :blocks="blocks" :loading="blocksLoading" />

      <!-- Recent Blocks Fee Table -->
      <BlockFeeTable
        :blocks="blocks"
        :loading="blocksLoading"
        :error="blocksError"
        @refresh="loadData"
        @retry="loadBlocks"
      />

      <!-- About Neo N3 Fees -->
      <div class="etherscan-card mt-6 p-5">
        <h2 class="text-high mb-2 text-base font-semibold">{{ $t("gasTracker.aboutTitle") }}</h2>
        <div class="text-mid space-y-2 text-sm leading-relaxed">
          <p>
            {{ $t("gasTracker.aboutPara1Prefix") }}
            <strong class="text-high">{{ $t("gasTracker.aboutSystemFee") }}</strong>
            {{ $t("gasTracker.aboutSystemFeeDescription") }}
            <strong class="text-high">{{ $t("gasTracker.aboutNetworkFee") }}</strong>
            {{ $t("gasTracker.aboutNetworkFeeDescription") }}
          </p>
          <p>{{ $t("gasTracker.aboutPara2", { rate: BURN_RATE }) }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import FeeEstimateCards from "./components/FeeEstimateCards.vue";
import FeeSummary from "./components/FeeSummary.vue";
import FeeTrendChart from "./components/FeeTrendChart.vue";
import BlockFeeTable from "./components/BlockFeeTable.vue";
import { statsService, blockService } from "@/services";
import { indexerReadService } from "@/services/indexerReadService";
import { BURN_RATE } from "@/constants";
import { useAutoRefresh } from "@/composables/useAutoRefresh";

// --- State ---
const { t } = useI18n();

const loading = ref(true);
const blocksLoading = ref(true);
const blocksError = ref(null);
const gasError = ref(false);

const gasData = ref({
  latestNetworkFee: "0",
  latestSystemFee: "0",
  networkFee: null,
});

const feeEstimates = ref({ low: 0, average: 0, high: 0 });
const blocks = ref([]);

let isRefreshing = false;

// --- Fee estimation: rolling buffer of recent transactions ---
// Sourced from the indexer's /transactions endpoint, not blocks: Neo N3
// produces empty blocks every ~15s during low traffic, so a small block
// sample frequently has zero fee-bearing items.
//
// The buffer is module-level (survives auto-refresh ticks within the same
// session) and updates incrementally — initial fill is 5 sequential fetches
// of 200 (= 1000 tx ≈ 3-5 minutes of activity at low traffic), then each
// refresh fetches just the latest 100, dedups against the buffer's newest
// txid, prepends new entries, and trims back to BUFFER_TARGET.
//
// Replaces the previous 20-tx single-fetch sample, which gave statistically
// unstable estimates on Neo's typically-empty blocks.
const FEE_BUFFER_TARGET = 1000;
const FEE_INITIAL_PAGES = 5;
const FEE_PAGE_SIZE = 200;
const FEE_INCREMENTAL_FETCH = 100;

let feeBuffer = []; // [{txid, sys_fee, net_fee}, ...] newest first
let lastSeenTxid = null;

function txTotalFee(tx) {
  return (Number(tx?.sys_fee) || 0) + (Number(tx?.net_fee) || 0);
}

function recomputeFeeEstimatesFromBuffer() {
  const fees = feeBuffer
    .map(txTotalFee)
    .filter((f) => f > 0)
    .sort((a, b) => a - b);

  if (!fees.length) {
    feeEstimates.value = { low: 0, average: 0, high: 0 };
    return;
  }

  // Use percentiles instead of min/max so a single outlier tx doesn't
  // skew "low" or "high". 25th / 50th / 75th percentile is the usual
  // gas-tracker shape.
  const at = (p) => fees[Math.min(fees.length - 1, Math.max(0, Math.floor(fees.length * p)))];
  const median = at(0.5);
  feeEstimates.value = {
    low: at(0.25),
    average: median,
    high: at(0.75),
  };
}

async function refreshFeeBuffer(forceRefresh = false) {
  // Initial fill happens once per session — auto-refresh ticks just
  // append the latest delta. `forceRefresh` controls cache bypass on
  // each request; it does NOT trigger a buffer rebuild (that would
  // re-fetch 1000 tx every 30s, defeating the rolling-window design).
  if (feeBuffer.length === 0) {
    const pages = await Promise.all(
      Array.from({ length: FEE_INITIAL_PAGES }, (_, i) =>
        indexerReadService.getRecentTransactions(FEE_PAGE_SIZE, i * FEE_PAGE_SIZE, { forceRefresh })
          .catch(() => []),
      ),
    );
    feeBuffer = pages.flat().filter((tx) => tx?.txid);
    lastSeenTxid = feeBuffer[0]?.txid || null;
    recomputeFeeEstimatesFromBuffer();
    return;
  }

  // Incremental — fetch the newest FEE_INCREMENTAL_FETCH and find the
  // boundary against our last-seen txid.
  const latest = await indexerReadService.getRecentTransactions(FEE_INCREMENTAL_FETCH, 0, { forceRefresh })
    .catch(() => []);
  const newRows = [];
  for (const tx of latest) {
    if (!tx?.txid) continue;
    if (tx.txid === lastSeenTxid) break;
    newRows.push(tx);
  }
  if (newRows.length > 0) {
    feeBuffer = [...newRows, ...feeBuffer].slice(0, FEE_BUFFER_TARGET);
    lastSeenTxid = feeBuffer[0]?.txid || lastSeenTxid;
    recomputeFeeEstimatesFromBuffer();
  }
}

// --- Data loading ---
async function loadGasTracker(forceRefresh = false) {
  loading.value = true;
  gasError.value = false;
  try {
    const data = await statsService.getGasTracker(forceRefresh);
    gasData.value = data;
  } catch (e) {
    if (import.meta.env.DEV) console.error("Gas tracker load failed:", e);
    gasError.value = true;
  } finally {
    loading.value = false;
  }
}

async function loadBlocks(forceRefresh = false) {
  blocksLoading.value = true;
  blocksError.value = null;
  try {
    const [blockRes] = await Promise.all([
      blockService.getList(20, 0, { forceRefresh, enrichMissingFields: true }),
      // Fee buffer updates incrementally — see refreshFeeBuffer comment.
      // First call fetches 1000 tx; subsequent calls fetch only the
      // latest 100 and dedup against the last-seen txid.
      refreshFeeBuffer(forceRefresh),
    ]);
    blocks.value = blockRes?.result || [];
  } catch (e) {
    blocksError.value = e.message || t("gasTracker.failedLoadBlocks");
  } finally {
    blocksLoading.value = false;
  }
}

async function loadData(forceRefresh = false) {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    await Promise.all([loadGasTracker(forceRefresh), loadBlocks(forceRefresh)]);
  } finally {
    isRefreshing = false;
  }
}

// --- Auto-refresh (network-aware) ---
// useAutoRefresh handles visibility pause, network-change retick, and
// keep-alive deactivation — replacing the prior raw setInterval which
// kept hitting the network with the tab hidden.
const { isActive: autoRefreshActive, start: startAutoRefresh } = useAutoRefresh(
  () =>
    loadData(true).catch((err) => {
      if (import.meta.env.DEV) console.warn("[GasTracker] auto-refresh failed:", err);
    }),
);

// --- Lifecycle ---
onMounted(() => {
  loadData();
  startAutoRefresh();
});
</script>
