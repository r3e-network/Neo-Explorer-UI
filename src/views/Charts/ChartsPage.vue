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
        <span class="text-mid text-sm font-medium">Time Range:</span>
        <button
          v-for="option in dayOptions"
          :key="option"
          type="button"
          class="tab-btn focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          :aria-pressed="selectedDays === option"
          :class="
            selectedDays === option
              ? 'tab-btn-active'
              : 'tab-btn-inactive'
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
          <p class="text-low text-xs">{{ peakDate }}</p>
        </div>
        <div class="stat-card p-4">
          <p class="stat-label">Data Points</p>
          <p class="stat-value text-xl">{{ chartData.length }} days</p>
        </div>
      </div>

      <!-- Daily Transactions Chart -->
      <div class="etherscan-card mb-6 p-5">
        <h2 class="text-high mb-1 text-base font-semibold">Daily Transactions</h2>
        <p class="text-low mb-4 text-xs">
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
        <h2 class="text-high mb-1 text-base font-semibold">Address Growth</h2>
        <p class="text-low mb-4 text-xs">
          Daily new address growth over time
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
        <h2 class="text-high mb-1 text-base font-semibold">Transaction Volume</h2>
        <p class="text-low mb-4 text-xs">
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

      <!-- Contract Deployment Chart -->
      <div class="etherscan-card p-5 mt-6">
        <h2 class="text-high mb-1 text-base font-semibold">Contract Deployments</h2>
        <p class="text-low mb-4 text-xs">
          Daily new smart contract deployments
        </p>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 4" :key="i" height="44px" />
        </div>
        <div v-else-if="error" class="py-2">
          <ErrorState title="Failed to load contract chart" :message="error" @retry="loadData" />
        </div>
        <div v-else class="h-[360px]">
          <canvas ref="contractChart"></canvas>
        </div>
      </div>

      <!-- Token Transfer Volume Chart -->
      <div class="etherscan-card p-5 mt-6">
        <h2 class="text-high mb-1 text-base font-semibold">Token Transfer Volume</h2>
        <p class="text-low mb-4 text-xs">
          Estimated daily token transfer volume
        </p>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 4" :key="i" height="44px" />
        </div>
        <div v-else-if="error" class="py-2">
          <ErrorState title="Failed to load token volume chart" :message="error" @retry="loadData" />
        </div>
        <div v-else class="h-[360px]">
          <canvas ref="tokenVolumeChart"></canvas>
        </div>
      </div>

      <!-- GAS Price History Chart -->
      <div class="etherscan-card p-5 mt-6">
        <h2 class="text-high mb-1 text-base font-semibold">GAS Price History</h2>
        <p class="text-low mb-4 text-xs">
          Daily historical GAS price trend
        </p>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 4" :key="i" height="44px" />
        </div>
        <div v-else-if="error" class="py-2">
          <ErrorState title="Failed to load gas price chart" :message="error" @retry="loadData" />
        </div>
        <div v-else class="h-[360px]">
          <canvas ref="gasPriceChart"></canvas>
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
const addressGrowthData = ref([]);
const contractData = ref([]);
const tokenVolumeData = ref([]);
const gasPriceData = ref([]);

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
      labels: data.map((_, i) => formatDateLabel(formatDayOffset(selectedDays.value - i - 1))),
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


// --- Chart lifecycle ---
function destroyCharts() {
  if (contractChartInstance) { contractChartInstance.destroy(); contractChartInstance = null; }
  if (tokenVolumeChartInstance) { tokenVolumeChartInstance.destroy(); tokenVolumeChartInstance = null; }
  if (gasPriceChartInstance) { gasPriceChartInstance.destroy(); gasPriceChartInstance = null; }
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
  const txValues = chartData.value.map((d) => d.transactions);
  const addrGrowthValues = addressGrowthData.value.map((d) => d.value ?? d.NewAddresses ?? 0);
  const contractValues = contractData.value.map((d) => d.value);
  const tokenVolValues = tokenVolumeData.value.map((d) => d.value);
  const gasPriceValues = gasPriceData.value.map((d) => d.value);

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
    label: "Address Growth",
    color: "#00B42A",
    bgColor: "rgba(0, 180, 42, 0.08)",
    tooltipLabel: "New Addresses",
    data: addrGrowthValues,
  });

  volumeChartInstance = createChart(volumeChart, {
    type: "bar",
    label: "Transaction Volume",
    color: "#FF7D00",
    bgColor: "rgba(255, 125, 0, 0.6)",
    tooltipLabel: "Volume",
    data: txValues,
  });

  contractChartInstance = createChart(contractChart, {
    type: "line",
    label: "Contract Deployments",
    color: "#722ED1",
    bgColor: "rgba(114, 46, 209, 0.08)",
    tooltipLabel: "Deployments",
    data: contractValues,
  });

  tokenVolumeChartInstance = createChart(tokenVolumeChart, {
    type: "line",
    label: "Token Transfer Volume",
    color: "#F5319D",
    bgColor: "rgba(245, 49, 157, 0.08)",
    tooltipLabel: "Volume",
    data: tokenVolValues,
  });

  gasPriceChartInstance = createChart(gasPriceChart, {
    type: "line",
    label: "GAS Price",
    color: "#F7BA1E",
    bgColor: "rgba(247, 186, 30, 0.08)",
    tooltipLabel: "GAS Price",
    data: gasPriceValues,
  });
}

// --- Data loading ---
async function loadData() {
  loading.value = true;
  error.value = null;
  try {
    const [rawActivity, rawGrowth, rawContract, rawTokenVol, rawGasPrice] = await Promise.all([
      statsService.getNetworkActivity(selectedDays.value),
      statsService.getDailyAddressGrowth(selectedDays.value),
      statsService.getDailyContracts(selectedDays.value),
      statsService.getTokenTransferVolume(selectedDays.value),
      statsService.getGasPriceHistory(selectedDays.value)
    ]);
    
    chartData.value = normalizeChartData(rawActivity, selectedDays.value);
    
    // Fallback/normalize mock data lengths
    const fillMockData = (raw) => {
      const arr = Array.isArray(raw) ? raw : [];
      if (arr.length === 0) return Array.from({ length: selectedDays.value }, () => ({ value: 0 }));
      if (arr.length < selectedDays.value) {
         return [...Array.from({ length: selectedDays.value - arr.length }, () => ({ value: 0 })), ...arr];
      }
      return arr.slice(-selectedDays.value);
    };

    addressGrowthData.value = fillMockData(rawGrowth, 'NewAddresses');
    contractData.value = fillMockData(rawContract);
    tokenVolumeData.value = fillMockData(rawTokenVol);
    gasPriceData.value = fillMockData(rawGasPrice);

    await renderCharts();
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
  loadData();
}

// --- Lifecycle ---
onMounted(() => {
  loadData();
});

onBeforeUnmount(() => {
  destroyCharts();
});
</script>
