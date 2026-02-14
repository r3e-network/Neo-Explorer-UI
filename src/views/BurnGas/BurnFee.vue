<template>
  <div class="burn-fee-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <!-- Breadcrumb -->
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Burned GAS' }]" />

      <!-- Page Header -->
      <div class="mb-6 flex items-center gap-3">
        <div
          class="page-header-icon bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
            />
          </svg>
        </div>
        <div>
          <h1 class="page-title">Burned GAS</h1>
          <p class="page-subtitle">
            GAS burn statistics from Neo N3 system fee consumption
          </p>
        </div>
      </div>

      <!-- Summary Cards -->
      <div v-if="loading" class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton v-for="i in 3" :key="i" height="110px" variant="rounded" />
      </div>
      <div v-else class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <!-- Total GAS Burned -->
        <div class="stat-card">
          <p class="stat-label">Total GAS Burned</p>
          <p class="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
            {{ formatGasDisplay(totalBurned) }}
          </p>
          <p class="mt-1 text-xs text-text-muted dark:text-gray-500">GAS</p>
        </div>

        <!-- Daily Burn Rate -->
        <div class="stat-card">
          <p class="stat-label">Avg Daily Burn</p>
          <p class="stat-value text-2xl">
            {{ formatGasDisplay(avgDailyBurn) }}
          </p>
          <p class="mt-1 text-xs text-text-muted dark:text-gray-500">GAS / day</p>
        </div>

        <!-- Burn Trend -->
        <div class="stat-card">
          <p class="stat-label">Burn Rate per Tx</p>
          <p class="stat-value text-2xl">
            {{ BURN_RATE }}
          </p>
          <p class="mt-1 text-xs text-text-muted dark:text-gray-500">GAS (system fee burn)</p>
        </div>
      </div>

      <!-- Cumulative Burn Chart (Area) -->
      <div class="etherscan-card mb-6 p-5">
        <h2 class="mb-1 text-base font-semibold text-text-primary dark:text-gray-200">Cumulative GAS Burned</h2>
        <p class="mb-4 text-xs text-text-muted dark:text-gray-500">Running total of estimated GAS burned over time</p>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 5" :key="i" height="44px" />
        </div>
        <div v-else-if="error" class="py-2">
          <ErrorState title="Failed to load burn data" :message="error" @retry="loadData" />
        </div>
        <div v-else class="h-[360px]">
          <canvas ref="cumulativeCanvas"></canvas>
        </div>
      </div>

      <!-- Daily Burn Chart (Bar) -->
      <div class="etherscan-card mb-6 p-5">
        <h2 class="mb-1 text-base font-semibold text-text-primary dark:text-gray-200">Daily GAS Burned</h2>
        <p class="mb-4 text-xs text-text-muted dark:text-gray-500">
          Estimated daily GAS burn based on transaction count
        </p>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 4" :key="i" height="44px" />
        </div>
        <div v-else-if="error" class="py-2">
          <ErrorState title="Failed to load burn data" :message="error" @retry="loadData" />
        </div>
        <div v-else class="h-[360px]">
          <canvas ref="dailyBurnCanvas"></canvas>
        </div>
      </div>

      <!-- Info Card -->
      <div class="etherscan-card p-5">
        <h2 class="mb-2 text-base font-semibold text-text-primary dark:text-gray-200">About GAS Burning</h2>
        <div class="space-y-2 text-sm leading-relaxed text-text-secondary dark:text-gray-400">
          <p>
            In Neo N3, system fees paid for smart contract execution are
            <strong class="text-text-primary dark:text-gray-300">burned</strong> (permanently removed from circulation),
            creating deflationary pressure on the GAS token supply.
          </p>
          <p>
            The burn rate is approximately
            <strong class="text-text-primary dark:text-gray-300">{{ BURN_RATE }} GAS</strong>
            per transaction. Actual burn amounts vary based on contract complexity and computational resources consumed.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import { statsService } from "@/services";
import { BURN_RATE } from "@/constants";

// --- State ---
const loading = ref(true);
const error = ref(null);
const dailyData = ref([]);

// --- Canvas refs ---
const cumulativeCanvas = ref(null);
const dailyBurnCanvas = ref(null);

// --- Chart instances ---
let cumulativeChart = null;
let dailyBurnChart = null;

// --- Computed ---
const totalBurned = computed(() => {
  return dailyData.value.reduce((sum, d) => sum + d.burned, 0);
});

const avgDailyBurn = computed(() => {
  if (!dailyData.value.length) return 0;
  return totalBurned.value / dailyData.value.length;
});

// --- Helpers ---
function formatGasDisplay(value) {
  return Number(value || 0).toFixed(8);
}

function formatDayOffset(offset) {
  const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
  return date.toISOString().split("T")[0];
}

function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

// --- Data normalization ---
function normalizeData(raw) {
  const list = Array.isArray(raw) ? raw : [];
  if (!list.length) {
    return Array.from({ length: 30 }, (_, i) => ({
      date: formatDayOffset(29 - i),
      transactions: 0,
      burned: 0,
    }));
  }

  const mapped = list.map((entry, i) => {
    const date = entry?.date || entry?.Date || entry?.day || formatDayOffset(list.length - i - 1);
    const txs = Number(entry?.transactions ?? entry?.DailyTransactions ?? entry?.dailyTransactions ?? entry?.txs ?? 0);
    return {
      date,
      transactions: txs,
      burned: txs * BURN_RATE,
    };
  });

  if (mapped.length > 1 && mapped[0].date > mapped[mapped.length - 1].date) {
    mapped.reverse();
  }
  return mapped;
}

// --- Chart creation ---
function baseTooltipConfig(colors) {
  return {
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
  };
}

function baseScalesConfig(colors) {
  return {
    xAxes: [
      {
        gridLines: { display: false },
        ticks: { fontColor: colors.text, fontSize: 11, maxTicksLimit: 10 },
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
  };
}

function createCumulativeChart(Chart) {
  if (!cumulativeCanvas.value) return;
  const ctx = cumulativeCanvas.value.getContext("2d");
  const colors = getChartColors();
  const labels = dailyData.value.map((d) => formatDateLabel(d.date));

  // Build cumulative series
  let running = 0;
  const cumulative = dailyData.value.map((d) => {
    running += d.burned;
    return running;
  });

  cumulativeChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Cumulative GAS Burned",
          data: cumulative,
          fill: true,
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          borderColor: "#EF4444",
          borderWidth: 2,
          lineTension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointBackgroundColor: "#EF4444",
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
        ...baseTooltipConfig(colors),
        callbacks: {
          label: (item) => `Total Burned: ${Number(item.yLabel).toFixed(8)} GAS`,
        },
      },
      scales: {
        xAxes: [
          {
            gridLines: { display: false },
            ticks: { fontColor: colors.text, fontSize: 11, maxTicksLimit: 10 },
          },
        ],
        yAxes: [
          {
            gridLines: { color: colors.grid, drawBorder: false },
            ticks: {
              fontColor: colors.text,
              fontSize: 11,
              beginAtZero: true,
              callback: (v) => v.toFixed(2),
            },
          },
        ],
      },
    },
  });
}

function createDailyBurnChart(Chart) {
  if (!dailyBurnCanvas.value) return;
  const ctx = dailyBurnCanvas.value.getContext("2d");
  const colors = getChartColors();
  const labels = dailyData.value.map((d) => formatDateLabel(d.date));
  const values = dailyData.value.map((d) => d.burned);

  dailyBurnChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Daily GAS Burned",
          data: values,
          backgroundColor: "rgba(249, 115, 22, 0.6)",
          borderColor: "#F97316",
          borderWidth: 1,
          hoverBackgroundColor: "rgba(249, 115, 22, 0.8)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      legend: { display: false },
      tooltips: {
        ...baseTooltipConfig(colors),
        callbacks: {
          label: (item) => `Burned: ${Number(item.yLabel).toFixed(8)} GAS`,
        },
      },
      scales: baseScalesConfig(colors),
    },
  });
}

// --- Chart lifecycle ---
function destroyCharts() {
  if (cumulativeChart) {
    cumulativeChart.destroy();
    cumulativeChart = null;
  }
  if (dailyBurnChart) {
    dailyBurnChart.destroy();
    dailyBurnChart = null;
  }
}

async function renderCharts() {
  destroyCharts();
  const { default: ChartJS } = await import("chart.js");
  await nextTick();
  createCumulativeChart(ChartJS);
  createDailyBurnChart(ChartJS);
}

// --- Data loading ---
async function loadData() {
  loading.value = true;
  error.value = null;
  try {
    const raw = await statsService.getNetworkActivity(30);
    dailyData.value = normalizeData(raw);
    renderCharts();
  } catch (err) {
    if (import.meta.env.DEV) console.error("Failed to load burn metrics:", err);
    error.value = "Unable to load burn metrics. Please try again.";
  } finally {
    loading.value = false;
  }
}

// --- Lifecycle ---
onMounted(() => {
  loadData();
});

onBeforeUnmount(() => {
  destroyCharts();
});
</script>
