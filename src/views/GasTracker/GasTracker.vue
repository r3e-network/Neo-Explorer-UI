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
          <p class="page-subtitle">{{ $t("gasTracker.pageSubtitle") }}</p>
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
import { statsService } from "@/services/statsService";
import { blockService } from "@/services/blockService";
import { indexerReadService } from "@/services/indexerReadService";
import { BURN_RATE } from "@/constants";
import { createRollingTxBuffer, feePercentileEstimates, txTotalFee } from "@/utils/rollingTxBuffer";
import { isAbortError } from "@/utils/abortError";

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

// Module-level rolling buffer of recent transactions (survives across
// auto-refresh ticks in the same session). First refresh fetches 1000
// tx; later refreshes fetch only the latest 100 and prepend the delta.
// See utils/rollingTxBuffer for the design + tests.
const feeTxBuffer = createRollingTxBuffer({
  fetchPage: (limit, offset, options) =>
    indexerReadService.getRecentTransactions(limit, offset, options),
});

async function refreshFeeBuffer(forceRefresh = false) {
  await feeTxBuffer.refresh(forceRefresh);
  const fees = feeTxBuffer.entries.map(txTotalFee);
  feeEstimates.value = feePercentileEstimates(fees);
}

// --- Data loading ---
async function loadGasTracker(forceRefresh = false) {
  loading.value = true;
  gasError.value = false;
  try {
    const data = await statsService.getGasTracker(forceRefresh);
    gasData.value = data;
  } catch (e) {
    if (isAbortError(e)) return;
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
    if (isAbortError(e)) return;
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

// --- Lifecycle ---
// Loads once on mount. User can refresh manually via the BlockFeeTable
// "@refresh" emit, the FeeSummary error retry button, or by reloading
// the page. No auto-polling — keeps the page network-quiet for users
// who leave the tab open.
onMounted(() => {
  loadData();
});
</script>
