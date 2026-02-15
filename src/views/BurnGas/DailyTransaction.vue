<template>
  <div class="daily-transaction-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <!-- Breadcrumb -->
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Charts & Statistics' }]" />

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
          <h1 class="page-title">Neo N3 Blockchain Charts &amp; Statistics</h1>
          <p class="page-subtitle">Network activity, address growth, and transaction volume analytics</p>
        </div>
      </div>

      <!-- Day Range Toggle -->
      <div class="mb-6 flex flex-wrap items-center gap-2">
        <span class="text-sm font-medium text-text-secondary dark:text-gray-400">Time Range:</span>
        <button
          v-for="option in dayOptions"
          :key="option"
          class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            selectedDays === option
              ? 'bg-primary-50 text-primary-500 dark:bg-primary-900/30 dark:text-primary-400'
              : 'bg-gray-100 text-text-secondary hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          "
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
          <p class="stat-label">Avg Txns / Day</p>
          <p class="stat-value text-xl">{{ formatNumber(avgTxPerDay) }}</p>
        </div>
        <div class="stat-card p-4">
          <p class="stat-label">Total Txns</p>
          <p class="stat-value text-xl">{{ formatNumber(totalTxns) }}</p>
        </div>
        <div class="stat-card p-4">
          <p class="stat-label">Peak Day</p>
          <p class="stat-value text-xl">{{ formatNumber(peakTxns) }}</p>
          <p class="text-xs text-text-muted dark:text-gray-500">{{ peakDate }}</p>
        </div>
        <div class="stat-card p-4">
          <p class="stat-label">Data Points</p>
          <p class="stat-value text-xl">{{ chartData.length }} days</p>
        </div>
      </div>

      <!-- Daily Transactions Chart -->
      <div class="etherscan-card mb-6 p-5">
        <h2 class="mb-1 text-base font-semibold text-text-primary dark:text-gray-200">Daily Transactions</h2>
        <p class="mb-4 text-xs text-text-muted dark:text-gray-500">
          Number of transactions confirmed on the Neo N3 network per day
        </p>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 5" :key="i" height="44px" />
        </div>
        <div v-else-if="error" class="py-2">
          <ErrorState title="Failed to load transaction chart" :message="error" @retry="loadData" />
        </div>
        <div v-else class="h-[360px]">
          <canvas ref="txChart"></canvas>
        </div>
      </div>

      <!-- Active Addresses Chart -->
      <div class="etherscan-card mb-6 p-5">
        <h2 class="mb-1 text-base font-semibold text-text-primary dark:text-gray-200">Active Addresses</h2>
        <p class="mb-4 text-xs text-text-muted dark:text-gray-500">
          Unique addresses that sent or received transactions per day
        </p>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 4" :key="i" height="44px" />
        </div>
        <div v-else-if="error" class="py-2">
          <ErrorState title="Failed to load address chart" :message="error" @retry="loadData" />
        </div>
        <div v-else class="h-[360px]">
          <canvas ref="addressChart"></canvas>
        </div>
      </div>

      <!-- Transaction Volume (Bar Chart) -->
      <div class="etherscan-card p-5">
        <h2 class="mb-1 text-base font-semibold text-text-primary dark:text-gray-200">Transaction Volume</h2>
        <p class="mb-4 text-xs text-text-muted dark:text-gray-500">
          Daily transaction volume represented as a bar chart
        </p>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 4" :key="i" height="44px" />
        </div>
        <div v-else-if="error" class="py-2">
          <ErrorState title="Failed to load volume chart" :message="error" @retry="loadData" />
        </div>
        <div v-else class="h-[360px]">
          <canvas ref="volumeChart"></canvas>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import Chart from "chart.js";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import { statsService } from "@/services";
import { formatNumber } from "@/utils/explorerFormat";
import { getChartColors, baseTooltipConfig, baseScalesConfig } from "@/utils/chartHelpers";

// --- State ---
const { t } = useI18n();
const loading = ref(true);
const error = ref(null);
const selectedDays = ref(30);
const dayOptions = [30, 60, 90];
const chartData = ref([]);

// --- Canvas refs ---
const txChart = ref(null);
const addressChart = ref(null);
const volumeChart = ref(null);

// --- Chart instances ---
let txChartInstance = null;
let addressChartInstance = null;
let volumeChartInstance = null;

// --- Computed stats ---
const totalTxns = computed(() => {
  return chartData.value.reduce((s, d) => s + d.transactions, 0);
});

const avgTxPerDay = computed(() => {
  if (!chartData.value.length) return 0;
  return Math.round(totalTxns.value / chartData.value.length);
});

const peakTxns = computed(() => {
  const values = chartData.value?.map((d) => d.transactions) ?? [];
  return values.length ? Math.max(...values) : 0;
});

const peakDate = computed(() => {
  if (!chartData.value.length) return "";
  const peak = chartData.value.reduce((a, b) => (b.transactions > a.transactions ? b : a));
  return formatDateLabel(peak.date);
});

// --- Helpers ---
function formatDayOffset(offset) {
  const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
  return date.toISOString().split("T")[0];
}

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

// --- Data normalization ---
function normalizeChartData(raw, days) {
  const list = Array.isArray(raw) ? raw : [];
  if (!list.length) {
    return Array.from({ length: days }, (_, i) => ({
      date: formatDayOffset(days - i - 1),
      transactions: 0,
      addresses: 0,
    }));
  }

  const mapped = list.map((entry, i) => {
    const date = entry?.date || entry?.Date || entry?.day || entry?.Day || formatDayOffset(list.length - i - 1);
    return {
      date,
      transactions: Number(
        entry?.transactions ?? entry?.DailyTransactions ?? entry?.dailyTransactions ?? entry?.txs ?? 0
      ),
      addresses: Number(entry?.addresses ?? entry?.activeAddresses ?? entry?.ActiveAddresses ?? 0),
    };
  });

  if (mapped.length > 1 && mapped[0].date > mapped[mapped.length - 1].date) {
    mapped.reverse();
  }
  return mapped;
}

// --- Chart factory ---
function createChart(canvasRef, { type, label, color, bgColor, tooltipLabel, data }) {
  if (!canvasRef.value) return null;
  const ctx = canvasRef.value.getContext("2d");
  const colors = getChartColors();

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
      labels: chartData.value.map((d) => formatDateLabel(d.date)),
      datasets: [dataset],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      legend: { display: false },
      tooltips: {
        ...baseTooltipConfig(colors),
        callbacks: {
          label: (item) => `${tooltipLabel}: ${Number(item.yLabel).toLocaleString()}`,
        },
      },
      scales: baseScalesConfig(colors, formatYAxis),
    },
  });
}

function updateChartData(instance, data) {
  if (!instance) return false;
  instance.data.labels = chartData.value.map((d) => formatDateLabel(d.date));
  instance.data.datasets[0].data = data;
  instance.update();
  return true;
}

// --- Chart lifecycle ---
function destroyCharts() {
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

async function renderCharts(dataOnly = false) {
  const txValues = chartData.value.map((d) => d.transactions);
  const addrValues = chartData.value.map((d) => d.addresses);

  if (dataOnly) {
    const updated =
      updateChartData(txChartInstance, txValues) &&
      updateChartData(addressChartInstance, addrValues) &&
      updateChartData(volumeChartInstance, txValues);
    if (updated) return;
  }

  destroyCharts();
  await nextTick();

  txChartInstance = createChart(txChart, {
    type: "line",
    label: "Daily Transactions",
    color: "#165DFF",
    bgColor: "rgba(22, 93, 255, 0.08)",
    tooltipLabel: "Transactions",
    data: txValues,
  });

  addressChartInstance = createChart(addressChart, {
    type: "line",
    label: "Active Addresses",
    color: "#00B42A",
    bgColor: "rgba(0, 180, 42, 0.08)",
    tooltipLabel: "Active Addresses",
    data: addrValues,
  });

  volumeChartInstance = createChart(volumeChart, {
    type: "bar",
    label: "Transaction Volume",
    color: "#FF7D00",
    bgColor: "rgba(255, 125, 0, 0.6)",
    tooltipLabel: "Volume",
    data: txValues,
  });
}

// --- Data loading ---
async function loadData(dataOnly = false) {
  loading.value = true;
  error.value = null;
  try {
    const raw = await statsService.getNetworkActivity(selectedDays.value);
    chartData.value = normalizeChartData(raw, selectedDays.value);
    await renderCharts(dataOnly);
  } catch (err) {
    if (import.meta.env.DEV) console.error("Failed to load chart data:", err);
    error.value = t("errors.loadChartData");
  } finally {
    loading.value = false;
  }
}

function changeDays(days) {
  if (selectedDays.value === days) return;
  selectedDays.value = days;
  loadData(true);
}

// --- Lifecycle ---
onMounted(() => {
  loadData();
});

onBeforeUnmount(() => {
  destroyCharts();
});
</script>
