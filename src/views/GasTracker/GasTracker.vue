<template>
  <div class="gas-tracker-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <!-- Breadcrumb -->
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Gas Tracker' }]" />

      <!-- Page Header -->
      <div class="mb-6 flex items-center gap-3">
        <div class="page-header-icon bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h1 class="page-title">Neo N3 Gas Tracker</h1>
          <p class="page-subtitle">
            Real-time network fee estimates and GAS analytics
            <span v-if="autoRefreshActive" class="ml-2 inline-flex items-center gap-1 text-xs text-green-500">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Live
            </span>
          </p>
        </div>
      </div>

      <!-- Fee Estimate Cards -->
      <FeeEstimateCards :feeEstimates="feeEstimates" :loading="loading" />

      <!-- Latest Fee Summary -->
      <FeeSummary :gasData="gasData" />

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
        <h2 class="mb-2 text-base font-semibold text-text-primary dark:text-gray-200">About Neo N3 Fees</h2>
        <div class="space-y-2 text-sm leading-relaxed text-text-secondary dark:text-gray-400">
          <p>
            Neo N3 transactions incur two types of fees:
            <strong class="text-text-primary dark:text-gray-300">System Fee</strong>
            (consumed for on-chain operations like contract invocations) and
            <strong class="text-text-primary dark:text-gray-300">Network Fee</strong>
            (paid to Consensus Nodes for transaction verification and inclusion).
          </p>
          <p>
            Unlike Ethereum's variable gas pricing, Neo N3 fees are deterministic and based on the computational
            resources consumed. The Network Fee is partially burned at a rate of
            {{ BURN_RATE }} GAS per byte, contributing to GAS deflation.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import FeeEstimateCards from "./components/FeeEstimateCards.vue";
import FeeSummary from "./components/FeeSummary.vue";
import FeeTrendChart from "./components/FeeTrendChart.vue";
import BlockFeeTable from "./components/BlockFeeTable.vue";
import { statsService, blockService } from "@/services";
import { BURN_RATE } from "@/constants";
import { getNetworkRefreshIntervalMs } from "@/utils/env";

// --- State ---
const loading = ref(true);
const blocksLoading = ref(true);
const blocksError = ref(null);
const autoRefreshActive = ref(true);

const gasData = ref({
  latestNetworkFee: "0",
  latestSystemFee: "0",
  networkFee: null,
});

const feeEstimates = ref({ low: 0, average: 0, high: 0 });
const blocks = ref([]);

let refreshTimer = null;
let isRefreshing = false;

// --- Fee estimation from block data ---
function totalFee(block) {
  return (Number(block.sysfee) || 0) + (Number(block.netfee) || 0);
}

function computeFeeEstimates() {
  const feeBearing = blocks.value.filter((b) => totalFee(b) > 0);
  if (!feeBearing.length) {
    feeEstimates.value = { low: 0, average: 0, high: 0 };
    return;
  }

  const fees = feeBearing.map((b) => totalFee(b));
  fees.sort((a, b) => a - b);

  feeEstimates.value = {
    low: fees[0],
    high: fees[fees.length - 1],
    average: Math.round(fees.reduce((s, f) => s + f, 0) / fees.length),
  };
}

// --- Data loading ---
async function loadGasTracker(forceRefresh = false) {
  loading.value = true;
  try {
    const data = await statsService.getGasTracker(forceRefresh);
    gasData.value = data;
  } catch (e) {
    if (import.meta.env.DEV) console.error("Gas tracker load failed:", e);
  } finally {
    loading.value = false;
  }
}

async function loadBlocks(forceRefresh = false) {
  blocksLoading.value = true;
  blocksError.value = null;
  try {
    const res = await blockService.getList(20, 0, { forceRefresh });
    blocks.value = res?.result || [];
    computeFeeEstimates();
  } catch (e) {
    blocksError.value = e.message || "Failed to load blocks";
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
function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = setInterval(() => {
    loadData(true).catch((err) => {
      if (import.meta.env.DEV) console.warn("[GasTracker] auto-refresh failed:", err);
    });
  }, getNetworkRefreshIntervalMs());
  autoRefreshActive.value = true;
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  autoRefreshActive.value = false;
}

// --- Lifecycle ---
onMounted(() => {
  loadData();
  startAutoRefresh();
});

onBeforeUnmount(() => {
  stopAutoRefresh();
});
</script>
