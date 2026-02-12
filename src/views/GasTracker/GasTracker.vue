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
      <div v-if="loading" class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton v-for="i in 3" :key="i" height="120px" variant="rounded" />
      </div>
      <div v-else class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <!-- Low Fee -->
        <div class="stat-card">
          <div class="mb-2 flex items-center gap-2">
            <span
              class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span class="stat-label text-sm normal-case tracking-normal">Low</span>
          </div>
          <p class="stat-value text-2xl">
            {{ formatGas(feeEstimates.low) }}
          </p>
          <p class="mt-1 text-xs text-text-muted dark:text-gray-500">GAS / transaction (slow)</p>
        </div>

        <!-- Average Fee -->
        <div class="stat-card border-primary-200 dark:border-primary-800">
          <div class="mb-2 flex items-center gap-2">
            <span
              class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </span>
            <span class="stat-label text-sm normal-case tracking-normal">Average</span>
          </div>
          <p class="stat-value text-2xl text-primary-600 dark:text-primary-400">
            {{ formatGas(feeEstimates.average) }}
          </p>
          <p class="mt-1 text-xs text-text-muted dark:text-gray-500">GAS / transaction (standard)</p>
        </div>

        <!-- High Fee -->
        <div class="stat-card">
          <div class="mb-2 flex items-center gap-2">
            <span
              class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                />
              </svg>
            </span>
            <span class="stat-label text-sm normal-case tracking-normal">High</span>
          </div>
          <p class="stat-value text-2xl">
            {{ formatGas(feeEstimates.high) }}
          </p>
          <p class="mt-1 text-xs text-text-muted dark:text-gray-500">GAS / transaction (fast)</p>
        </div>
      </div>

      <!-- Latest Fee Summary -->
      <div class="etherscan-card mb-6 p-5">
        <h2 class="mb-3 text-base font-semibold text-text-primary dark:text-gray-200">Latest Fee Summary</h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
            <p class="text-xs font-medium uppercase tracking-wide text-text-muted dark:text-gray-500">
              Latest System Fee
            </p>
            <p class="mt-1 text-lg font-semibold text-text-primary dark:text-gray-200">
              {{ formatGas(gasData.latestSystemFee) }} GAS
            </p>
          </div>
          <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
            <p class="text-xs font-medium uppercase tracking-wide text-text-muted dark:text-gray-500">
              Latest Network Fee
            </p>
            <p class="mt-1 text-lg font-semibold text-text-primary dark:text-gray-200">
              {{ formatGas(gasData.latestNetworkFee) }} GAS
            </p>
          </div>
        </div>
      </div>

      <!-- Fee Trend Chart -->
      <div class="etherscan-card mb-6 p-5">
        <h2 class="mb-1 text-base font-semibold text-text-primary dark:text-gray-200">Fee Trend</h2>
        <p class="mb-4 text-xs text-text-muted dark:text-gray-500">
          Average total fee per block from the last 20 blocks
        </p>
        <div v-if="blocksLoading" class="space-y-2">
          <Skeleton v-for="i in 4" :key="i" height="44px" />
        </div>
        <div v-else-if="blocks.length" class="h-[280px]">
          <canvas ref="feeTrendCanvas"></canvas>
        </div>
        <div v-else class="py-8 text-center text-sm text-text-muted dark:text-gray-500">
          No block data available for chart
        </div>
      </div>

      <!-- Recent Blocks Fee Table -->
      <div class="etherscan-card overflow-hidden">
        <div
          class="card-header"
        >
          <h2 class="text-sm font-semibold text-text-primary dark:text-gray-200">Recent Blocks - Fee Data</h2>
          <button @click="loadData" class="text-xs text-primary-500 hover:text-primary-600 dark:text-primary-400">
            Refresh
          </button>
        </div>

        <!-- Loading -->
        <div v-if="blocksLoading" class="space-y-2 p-4">
          <Skeleton v-for="i in 6" :key="i" height="44px" />
        </div>

        <!-- Error -->
        <div v-else-if="blocksError" class="p-4">
          <ErrorState title="Failed to load block fee data" :message="blocksError" @retry="loadBlocks" />
        </div>

        <!-- Empty -->
        <div v-else-if="!blocks.length" class="p-4">
          <EmptyState message="No block data available" icon="block" />
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[700px]">
            <thead class="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th class="table-header-cell">Block</th>
                <th class="table-header-cell">Age</th>
                <th class="table-header-cell text-center">Txns</th>
                <th class="table-header-cell-right">Avg Fee</th>
                <th class="table-header-cell-right">Total Fees</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
              <tr
                v-for="block in blocks"
                :key="block.hash"
                class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <td class="table-cell">
                  <router-link :to="`/block-info/${block.hash}`" class="font-medium etherscan-link">
                    {{ formatNumber(block.index) }}
                  </router-link>
                </td>
                <td class="table-cell-secondary">
                  {{ formatAge(block.timestamp) }}
                </td>
                <td class="table-cell text-center">
                  {{ block.txcount || 0 }}
                </td>
                <td class="table-cell text-right">
                  {{ formatGas(avgFee(block)) }}
                </td>
                <td class="table-cell text-right font-medium text-text-primary dark:text-gray-200">
                  {{ formatGas(totalFee(block)) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- About Neo N3 Fees -->
      <div class="etherscan-card mt-6 p-5">
        <h2 class="mb-2 text-base font-semibold text-text-primary dark:text-gray-200">About Neo N3 Fees</h2>
        <div class="space-y-2 text-sm leading-relaxed text-text-secondary dark:text-gray-400">
          <p>
            Neo N3 transactions incur two types of fees:
            <strong class="text-text-primary dark:text-gray-300">System Fee</strong> (consumed for on-chain operations
            like contract invocations) and
            <strong class="text-text-primary dark:text-gray-300">Network Fee</strong> (paid to Consensus Nodes for
            transaction verification and inclusion).
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
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import { statsService, blockService } from "@/services";
import { formatNumber, formatAge, formatGas } from "@/utils/explorerFormat";
import { GAS_DIVISOR, BURN_RATE, GAS_TRACKER_REFRESH_INTERVAL } from "@/constants";

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

// --- Canvas ref & chart instance ---
const feeTrendCanvas = ref(null);
let feeTrendChart = null;
let refreshTimer = null;
let isRefreshing = false;

// --- Helpers ---
function totalFee(block) {
  return (Number(block.sysfee) || 0) + (Number(block.netfee) || 0);
}

function avgFee(block) {
  const total = totalFee(block);
  const txCount = Number(block.txcount) || 1;
  return Math.round(total / txCount);
}

function isDarkMode() {
  return document.documentElement.classList.contains("dark");
}

function getChartColors() {
  const dark = isDarkMode();
  return {
    text: dark ? "#9CA3AF" : "#6B7280",
    grid: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    tooltipBg: dark ? "#1F2937" : "#ffffff",
    tooltipTitle: dark ? "#F9FAFB" : "#111827",
    tooltipBody: dark ? "#D1D5DB" : "#4B5563",
    tooltipBorder: dark ? "#374151" : "#E5E7EB",
  };
}

// --- Fee estimation from block data ---
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

// --- Fee Trend Chart ---
function destroyChart() {
  if (feeTrendChart) {
    feeTrendChart.destroy();
    feeTrendChart = null;
  }
}

async function renderChart() {
  destroyChart();
  const { default: ChartJS } = await import("chart.js");
  await nextTick();
  createFeeTrendChart(ChartJS);
}

function createFeeTrendChart(Chart) {
  if (!feeTrendCanvas.value || !blocks.value.length) return;
  destroyChart();

  const ctx = feeTrendCanvas.value.getContext("2d");
  const colors = getChartColors();

  // Reverse so oldest block is first (left side of chart)
  const sorted = [...blocks.value].reverse();
  const labels = sorted.map((b) => `#${Number(b.index).toLocaleString()}`);
  const values = sorted.map((b) => totalFee(b) / GAS_DIVISOR);

  feeTrendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Total Fee (GAS)",
          data: values,
          fill: true,
          backgroundColor: "rgba(16, 185, 129, 0.08)",
          borderColor: "#10B981",
          borderWidth: 2,
          lineTension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: "#10B981",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      legend: { display: false },
      tooltips: {
        mode: "index",
        intersect: false,
        backgroundColor: colors.tooltipBg,
        titleFontColor: colors.tooltipTitle,
        bodyFontColor: colors.tooltipBody,
        borderColor: colors.tooltipBorder,
        borderWidth: 1,
        xPadding: 12,
        yPadding: 10,
        displayColors: false,
        callbacks: {
          label: (item) => `Fee: ${Number(item.yLabel).toFixed(8)} GAS`,
        },
      },
      scales: {
        xAxes: [
          {
            gridLines: { display: false },
            ticks: { fontColor: colors.text, fontSize: 10, maxTicksLimit: 10 },
          },
        ],
        yAxes: [
          {
            gridLines: { color: colors.grid, drawBorder: false },
            ticks: {
              fontColor: colors.text,
              fontSize: 11,
              beginAtZero: true,
              callback: (v) => v.toFixed(4),
            },
          },
        ],
      },
    },
  });
}

// --- Data loading ---
async function loadGasTracker() {
  loading.value = true;
  try {
    const data = await statsService.getGasTracker();
    gasData.value = data;
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.error("Gas tracker load failed:", e);
  } finally {
    loading.value = false;
  }
}

async function loadBlocks() {
  blocksLoading.value = true;
  blocksError.value = null;
  try {
    const res = await blockService.getList(20, 0);
    blocks.value = res?.result || [];
    computeFeeEstimates();
    renderChart();
  } catch (e) {
    blocksError.value = e.message || "Failed to load blocks";
  } finally {
    blocksLoading.value = false;
  }
}

async function loadData() {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    await Promise.all([loadGasTracker(), loadBlocks()]);
  } finally {
    isRefreshing = false;
  }
}

// --- Auto-refresh (30s) ---
function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = setInterval(() => {
    loadData();
  }, GAS_TRACKER_REFRESH_INTERVAL);
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
  destroyChart();
});
</script>
