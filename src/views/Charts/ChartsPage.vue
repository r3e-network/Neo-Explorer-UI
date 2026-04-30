<template>
  <div class="daily-transaction-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <!-- Breadcrumb -->
      <Breadcrumb :items="[{ label: $t('breadcrumb.home'), to: '/homepage' }, { label: $t('breadcrumb.charts') }]" />

      <!-- Page Header -->
      <div class="mb-6 flex items-center gap-3">
        <div class="page-header-icon bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <div>
          <h1 class="page-title">{{ $t("pages.charts.title") }}</h1>
          <p class="page-subtitle">{{ $t("pages.charts.subtitle") }}</p>
        </div>
      </div>

      <!-- Day Range Toggle -->
      <div class="mb-6 flex flex-wrap items-center gap-2">
        <span class="text-mid text-sm font-medium">{{ $t("pages.charts.timeRange") }}</span>
        <button
          v-for="option in dayOptions"
          :key="option"
          type="button"
          class="tab-btn focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          :aria-pressed="selectedDays === option"
          :class="selectedDays === option ? 'tab-btn-active' : 'tab-btn-inactive'"
          @click="changeDays(option)"
        >
          {{ option }}d
        </button>
      </div>

      <!-- Summary Stats -->
      <div v-if="loading" class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Skeleton v-for="i in 4" :key="i" height="90px" variant="rounded" />
      </div>
      <div v-else class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="stat-card p-4">
          <p class="stat-label">{{ $t("pages.charts.statAvgPerDay") }}</p>
          <p class="stat-value text-xl">{{ formatNumber(avgTxPerDay) }}</p>
        </div>
        <div class="stat-card p-4">
          <p class="stat-label">{{ $t("pages.charts.statTotal") }}</p>
          <p class="stat-value text-xl">{{ formatNumber(totalTxns) }}</p>
        </div>
        <div class="stat-card p-4">
          <p class="stat-label">{{ $t("pages.charts.statPeak") }}</p>
          <p class="stat-value text-xl">{{ formatNumber(peakTxns) }}</p>
          <p class="text-low text-xs">{{ peakDate }}</p>
        </div>
        <div class="stat-card p-4">
          <p class="stat-label">{{ $t("pages.charts.statDataPoints") }}</p>
          <p class="stat-value text-xl">{{ $t("pages.charts.statDataPointsValue", { count: dailyRows.length }) }}</p>
        </div>
      </div>

      <!-- Daily Transactions Chart -->
      <div class="etherscan-card mb-6 p-5">
        <h2 class="text-high mb-1 text-base font-semibold">{{ $t("pages.charts.chartDailyTxsTitle") }}</h2>
        <p class="text-low mb-4 text-xs">{{ $t("pages.charts.chartDailyTxsSubtitle") }}</p>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 5" :key="i" height="44px" />
        </div>
        <div v-else-if="error" class="py-2">
          <ErrorState :title="$t('common.failedToLoadChart')" :message="error" @retry="loadData" />
        </div>
        <div v-else class="h-[360px]">
          <canvas ref="txChart"></canvas>
        </div>
      </div>

      <!-- Active Signers Chart -->
      <div class="etherscan-card mb-6 p-5">
        <h2 class="text-high mb-1 text-base font-semibold">{{ $t("pages.charts.chartActiveAddressesTitle") }}</h2>
        <p class="text-low mb-4 text-xs">{{ $t("pages.charts.chartActiveAddressesSubtitle") }}</p>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 4" :key="i" height="44px" />
        </div>
        <div v-else-if="error" class="py-2">
          <ErrorState :title="$t('common.failedToLoadChart')" :message="error" @retry="loadData" />
        </div>
        <div v-else class="h-[360px]">
          <canvas ref="addressChart"></canvas>
        </div>
      </div>

      <!-- Transaction Volume (Bar Chart) -->
      <div class="etherscan-card p-5">
        <h2 class="text-high mb-1 text-base font-semibold">{{ $t("pages.charts.chartVolumeTitle") }}</h2>
        <p class="text-low mb-4 text-xs">{{ $t("pages.charts.chartVolumeSubtitle") }}</p>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 4" :key="i" height="44px" />
        </div>
        <div v-else-if="error" class="py-2">
          <ErrorState :title="$t('common.failedToLoadChart')" :message="error" @retry="loadData" />
        </div>
        <div v-else class="h-[360px]">
          <canvas ref="volumeChart"></canvas>
        </div>
      </div>

      <!-- NEP-11 Transfers Chart -->
      <div class="etherscan-card p-5 mt-6">
        <h2 class="text-high mb-1 text-base font-semibold">{{ $t("pages.charts.chartNep11Title") }}</h2>
        <p class="text-low mb-4 text-xs">{{ $t("pages.charts.chartNep11Subtitle") }}</p>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 4" :key="i" height="44px" />
        </div>
        <div v-else-if="error" class="py-2">
          <ErrorState :title="$t('common.failedToLoadChart')" :message="error" @retry="loadData" />
        </div>
        <div v-else class="h-[360px]">
          <canvas ref="contractChart"></canvas>
        </div>
      </div>

      <!-- NEP-17 Transfers Chart -->
      <div class="etherscan-card p-5 mt-6">
        <h2 class="text-high mb-1 text-base font-semibold">{{ $t("pages.charts.chartNep17Title") }}</h2>
        <p class="text-low mb-4 text-xs">{{ $t("pages.charts.chartNep17Subtitle") }}</p>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 4" :key="i" height="44px" />
        </div>
        <div v-else-if="error" class="py-2">
          <ErrorState :title="$t('common.failedToLoadChart')" :message="error" @retry="loadData" />
        </div>
        <div v-else class="h-[360px]">
          <canvas ref="tokenVolumeChart"></canvas>
        </div>
      </div>

      <!-- GAS Burned Chart -->
      <div class="etherscan-card p-5 mt-6">
        <h2 class="text-high mb-1 text-base font-semibold">{{ $t("pages.charts.chartGasBurnedTitle") }}</h2>
        <p class="text-low mb-4 text-xs">{{ $t("pages.charts.chartGasBurnedSubtitle") }}</p>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 4" :key="i" height="44px" />
        </div>
        <div v-else-if="error" class="py-2">
          <ErrorState :title="$t('common.failedToLoadChart')" :message="error" @retry="loadData" />
        </div>
        <div v-else class="h-[360px]">
          <canvas ref="gasPriceChart"></canvas>
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
import { statsService } from "@/services";
import { formatNumber } from "@/utils/explorerFormat";
import { getChartColors, baseTooltipConfig, baseScalesConfig } from "@/utils/chartHelpers";
import { useTheme } from "@/composables/useTheme";

// --- State ---
const { t } = useI18n();
const { isDark } = useTheme();
const loading = ref(true);
const error = ref(null);
const selectedDays = ref(30);
const dayOptions = [30, 60, 90];
// Padded daily-analytics rows from the indexer (one per day, oldest-first).
// Each row: { day, tx_count, active_signers, fee_burned, nep17_transfer_count, nep11_transfer_count }.
const dailyRows = ref([]);

// --- Canvas refs ---
const txChart = ref(null);
const contractChart = ref(null);
const tokenVolumeChart = ref(null);
const gasPriceChart = ref(null);
const addressChart = ref(null);
const volumeChart = ref(null);

// --- Chart instances ---
let txChartInstance = null;
let contractChartInstance = null;
let tokenVolumeChartInstance = null;
let gasPriceChartInstance = null;
let addressChartInstance = null;
let volumeChartInstance = null;
let renderGeneration = 0;

// --- Computed stats ---
const txValues = computed(() => dailyRows.value.map((r) => Number(r.tx_count) || 0));

const totalTxns = computed(() => txValues.value.reduce((s, v) => s + v, 0));

const avgTxPerDay = computed(() => {
  if (!txValues.value.length) return 0;
  return Math.round(totalTxns.value / txValues.value.length);
});

const peakTxns = computed(() => (txValues.value.length ? Math.max(...txValues.value) : 0));

const peakDate = computed(() => {
  if (!dailyRows.value.length || peakTxns.value === 0) return "";
  const peak = dailyRows.value.reduce((a, b) =>
    Number(b.tx_count) > Number(a.tx_count) ? b : a,
  );
  return formatDateLabel(peak.day);
});

// --- Helpers ---
function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatYAxis(value) {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M";
  if (value >= 1_000) return (value / 1_000).toFixed(1) + "K";
  return value;
}

// --- Chart factory ---
async function createChart(canvasRef, { type, label, color, bgColor, tooltipLabel, data, valueFormatter }) {
  if (!canvasRef.value) return null;
  const Chart = (await import("chart.js")).default;
  if (!canvasRef.value) return null;
  const ctx = canvasRef.value.getContext("2d");
  const colors = getChartColors();

  const formatValue =
    valueFormatter || ((v) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 4 }));

  const isBar = type === "bar";
  const dataset = {
    label,
    data,
    backgroundColor: bgColor,
    borderColor: color,
    borderWidth: isBar ? 1 : 2,
    ...(isBar
      ? { hoverBackgroundColor: bgColor.replace(/[\d.]+\)$/, "0.8)") }
      : {
          fill: true,
          lineTension: 0.35,
          pointRadius: selectedDays.value > 60 ? 0 : 3,
          pointHoverRadius: 5,
          pointBackgroundColor: color,
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
        }),
  };

  return new Chart(ctx, {
    type,
    data: {
      labels: dailyRows.value.map((r) => formatDateLabel(r.day)),
      datasets: [dataset],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      legend: { display: false },
      tooltips: {
        ...baseTooltipConfig(colors),
        callbacks: {
          label: (item) => `${tooltipLabel}: ${formatValue(item.yLabel)}`,
        },
      },
      scales: baseScalesConfig(colors, formatYAxis),
    },
  });
}

// --- Chart lifecycle ---
function destroyCharts() {
  if (contractChartInstance) {
    contractChartInstance.destroy();
    contractChartInstance = null;
  }
  if (tokenVolumeChartInstance) {
    tokenVolumeChartInstance.destroy();
    tokenVolumeChartInstance = null;
  }
  if (gasPriceChartInstance) {
    gasPriceChartInstance.destroy();
    gasPriceChartInstance = null;
  }
  if (txChartInstance) {
    txChartInstance.destroy();
    txChartInstance = null;
  }
  if (addressChartInstance) {
    addressChartInstance.destroy();
    addressChartInstance = null;
  }
  if (volumeChartInstance) {
    volumeChartInstance.destroy();
    volumeChartInstance = null;
  }
}

async function renderCharts() {
  const myGeneration = ++renderGeneration;
  const rows = dailyRows.value;
  const txs = rows.map((r) => Number(r.tx_count) || 0);
  const activeSigners = rows.map((r) => Number(r.active_signers) || 0);
  const nep17 = rows.map((r) => Number(r.nep17_transfer_count) || 0);
  const nep11 = rows.map((r) => Number(r.nep11_transfer_count) || 0);
  // fee_burned arrives as a string of fractoshi (10^8 GAS); convert to GAS for display.
  const gasBurned = rows.map((r) => Number(r.fee_burned || 0) / 1e8);

  destroyCharts();
  await nextTick();
  if (myGeneration !== renderGeneration) return;

  txChartInstance = await createChart(txChart, {
    type: "line",
    label: "Daily Transactions",
    color: "#165DFF",
    bgColor: "rgba(22, 93, 255, 0.08)",
    tooltipLabel: "Transactions",
    data: txs,
  });
  if (myGeneration !== renderGeneration) return;

  addressChartInstance = await createChart(addressChart, {
    type: "line",
    label: "Active Addresses",
    color: "#00B42A",
    bgColor: "rgba(0, 180, 42, 0.08)",
    tooltipLabel: "Active Addresses",
    data: activeSigners,
  });
  if (myGeneration !== renderGeneration) return;

  volumeChartInstance = await createChart(volumeChart, {
    type: "bar",
    label: "Transaction Volume",
    color: "#FF7D00",
    bgColor: "rgba(255, 125, 0, 0.6)",
    tooltipLabel: "Transactions",
    data: txs,
  });
  if (myGeneration !== renderGeneration) return;

  contractChartInstance = await createChart(contractChart, {
    type: "line",
    label: "NEP-11 Transfers",
    color: "#722ED1",
    bgColor: "rgba(114, 46, 209, 0.08)",
    tooltipLabel: "NEP-11 Transfers",
    data: nep11,
  });
  if (myGeneration !== renderGeneration) return;

  tokenVolumeChartInstance = await createChart(tokenVolumeChart, {
    type: "line",
    label: "NEP-17 Transfers",
    color: "#F5319D",
    bgColor: "rgba(245, 49, 157, 0.08)",
    tooltipLabel: "NEP-17 Transfers",
    data: nep17,
  });
  if (myGeneration !== renderGeneration) return;

  gasPriceChartInstance = await createChart(gasPriceChart, {
    type: "line",
    label: "GAS Burned",
    color: "#F7BA1E",
    bgColor: "rgba(247, 186, 30, 0.08)",
    tooltipLabel: "GAS Burned",
    data: gasBurned,
    valueFormatter: (v) =>
      `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 4 })} GAS`,
  });
}

// --- Data loading ---
async function loadData() {
  loading.value = true;
  error.value = null;
  try {
    dailyRows.value = await statsService.getDailyAnalytics(selectedDays.value);
    await renderCharts();
  } catch (err) {
    if (import.meta.env.DEV) console.error("Failed to load chart data:", err);
    dailyRows.value = [];
    error.value = t("errors.loadChartData");
  } finally {
    loading.value = false;
  }
}

function changeDays(days) {
  if (selectedDays.value === days) return;
  selectedDays.value = days;
  loadData();
}

// --- Theme reactivity ---
watch(isDark, () => {
  if (!loading.value && dailyRows.value.length) {
    renderCharts().catch(() => {});
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
