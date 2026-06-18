<template>
  <div class="burn-fee-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <!-- Breadcrumb -->
      <Breadcrumb :items="[{ label: $t('breadcrumb.home'), to: '/homepage' }, { label: $t('breadcrumb.burnedGas') }]" />

      <!-- Page Header -->
      <div class="mb-6 flex items-center gap-3">
        <div class="page-header-icon bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300">
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
          <h1 class="page-title">{{ $t("pages.burnGas.title") }}</h1>
          <p class="page-subtitle">{{ $t("pages.burnGas.subtitle") }}</p>
        </div>
      </div>

      <!-- Summary Cards -->
      <div v-if="loading" class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton v-for="i in 3" :key="i" height="110px" variant="rounded" />
      </div>
      <div v-else class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <!-- Total GAS Burned -->
        <div class="stat-card">
          <p class="stat-label">{{ $t("pages.burnGas.statTotal") }}</p>
          <p class="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
            {{ formatGasDisplay(totalBurned) }}
          </p>
          <p class="text-low mt-1 text-xs">GAS</p>
        </div>

        <!-- Daily Burn Rate -->
        <div class="stat-card">
          <p class="stat-label">{{ $t("pages.burnGas.statAvgDaily") }}</p>
          <p class="stat-value text-2xl">
            {{ formatGasDisplay(avgDailyBurn) }}
          </p>
          <p class="text-low mt-1 text-xs">{{ $t("pages.burnGas.statAvgDailyUnit") }}</p>
        </div>

        <!-- Burn Trend -->
        <div class="stat-card">
          <p class="stat-label">{{ $t("pages.burnGas.statAvgPerTx") }}</p>
          <p class="stat-value text-2xl">
            {{ formatGasDisplay(avgBurnPerTx) }}
          </p>
          <p class="text-low mt-1 text-xs">{{ $t("pages.burnGas.statAvgPerTxUnit") }}</p>
        </div>
      </div>

      <!-- Cumulative Burn Chart (Area) -->
      <div class="etherscan-card mb-6 p-5">
        <h2 class="text-high mb-1 text-base font-semibold">{{ $t("pages.burnGas.cumulativeTitle") }}</h2>
        <p class="text-low mb-4 text-xs">{{ $t("pages.burnGas.cumulativeSubtitle") }}</p>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 5" :key="i" height="44px" />
        </div>
        <div v-else-if="error" class="py-2">
          <ErrorState :title="$t('errorTitles.failedToLoadBurnData')" :message="error" @retry="loadData" />
        </div>
        <div v-else class="h-[360px]">
          <canvas ref="cumulativeCanvas"></canvas>
        </div>
      </div>

      <!-- Daily Burn Chart (Bar) -->
      <div class="etherscan-card mb-6 p-5">
        <h2 class="text-high mb-1 text-base font-semibold">{{ $t("pages.burnGas.dailyTitle") }}</h2>
        <p class="text-low mb-4 text-xs">{{ $t("pages.burnGas.dailySubtitle") }}</p>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 4" :key="i" height="44px" />
        </div>
        <div v-else-if="error" class="py-2">
          <ErrorState :title="$t('errorTitles.failedToLoadBurnData')" :message="error" @retry="loadData" />
        </div>
        <div v-else class="h-[360px]">
          <canvas ref="dailyBurnCanvas"></canvas>
        </div>
      </div>

      <!-- Info Card -->
      <div class="etherscan-card p-5">
        <h2 class="text-high mb-2 text-base font-semibold">{{ $t("pages.burnGas.aboutTitle") }}</h2>
        <div class="text-mid space-y-2 text-sm leading-relaxed">
          <p>
            {{ $t("pages.burnGas.aboutPara1Pre") }}
            <strong class="text-high">{{ $t("pages.burnGas.aboutBurned") }}</strong>
            {{ $t("pages.burnGas.aboutPara1Post") }}
          </p>
          <p>
            {{
              $t("pages.burnGas.aboutPara2", {
                days: dailyData.length,
                avg: formatGasDisplay(avgBurnPerTx),
                txs: totalTxs.toLocaleString(),
              })
            }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import { statsService } from "@/services/statsService";
import { getChartColors, baseTooltipConfig, baseScalesConfig } from "@/utils/chartHelpers";
import { useTheme } from "@/composables/useTheme";
import { toBcp47 } from "@/utils/timeFormat";
import { isAbortError } from "@/utils/abortError";

// --- State ---
const { t, locale } = useI18n();
const { isDark } = useTheme();
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
const totalBurned = computed(() => dailyData.value.reduce((sum, d) => sum + d.burned, 0));

const totalTxs = computed(() => dailyData.value.reduce((sum, d) => sum + d.transactions, 0));

const avgDailyBurn = computed(() => {
  if (!dailyData.value.length) return 0;
  return totalBurned.value / dailyData.value.length;
});

const avgBurnPerTx = computed(() => {
  if (!totalTxs.value) return 0;
  return totalBurned.value / totalTxs.value;
});

// --- Helpers ---
function formatGasDisplay(value) {
  return Number(value || 0).toFixed(8);
}

function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString(toBcp47(locale.value), { month: "short", day: "numeric" });
}

// --- Chart creation ---
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
          label: t("pages.burnGas.cumulativeTitle"),
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
          label: (item) => t("pages.burnGas.tooltipTotalBurned", { value: Number(item.yLabel).toFixed(8) }),
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
          label: t("pages.burnGas.dailyTitle"),
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
          label: (item) => t("pages.burnGas.tooltipDailyBurned", { value: Number(item.yLabel).toFixed(8) }),
        },
      },
      scales: baseScalesConfig(colors),
    },
  });
}

// --- Chart lifecycle ---
let renderGeneration = 0;

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
  const myGeneration = ++renderGeneration;
  destroyCharts();
  const { default: ChartJS } = await import("chart.js");
  await nextTick();
  if (myGeneration !== renderGeneration) return;
  createCumulativeChart(ChartJS);
  createDailyBurnChart(ChartJS);
}

// --- Data loading ---
async function loadData() {
  loading.value = true;
  error.value = null;
  try {
    const rows = await statsService.getDailyAnalytics(30);
    // fee_burned is fractoshi (10^8 GAS); convert to GAS for display.
    dailyData.value = rows.map((r) => ({
      date: r.day,
      transactions: Number(r.tx_count) || 0,
      burned: Number(r.fee_burned || 0) / 1e8,
    }));
    await renderCharts();
  } catch (err) {
    if (isAbortError(err)) return;
    if (import.meta.env.DEV) console.error("Failed to load burn metrics:", err);
    dailyData.value = [];
    error.value = t("errors.loadBurnMetrics");
  } finally {
    loading.value = false;
  }
}

// --- Theme + locale reactivity ---
// Re-render charts on theme toggle AND on locale switch so the x-axis
// date labels stay in the user's selected language.
watch([isDark, locale], () => {
  if (!loading.value && dailyData.value.length) {
    renderCharts();
  }
});

// --- Lifecycle ---
onMounted(() => {
  loadData();
});

onBeforeUnmount(() => {
  destroyCharts();
});
</script>
