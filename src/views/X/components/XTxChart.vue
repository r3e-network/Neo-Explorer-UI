<template>
  <div class="etherscan-card overflow-hidden" data-testid="x-tx-chart">
    <div class="card-header">
      <div>
        <h2 class="text-high text-base font-semibold">{{ tf("neoX.dailyTransactions", "Daily Transactions") }}</h2>
        <p class="text-low mt-1 text-xs">
          {{ tf("neoX.dailyTransactionsSubtitle", "Transactions per day on Neo X") }}
        </p>
      </div>
    </div>

    <div v-if="loading" class="space-y-2 p-4">
      <Skeleton v-for="i in 4" :key="i" height="44px" />
    </div>
    <div v-else-if="error" class="p-6">
      <ErrorState
        :title="tf('neoX.chartUnavailable', 'Unable to load chart')"
        :message="tf('neoX.tryAgain', 'Please try again in a moment.')"
        @retry="load"
      />
    </div>
    <div v-else-if="points.length === 0" class="p-6">
      <EmptyState :message="tf('neoX.noChartData', 'No chart data yet')" />
    </div>
    <div v-else class="p-4">
      <div class="h-[280px]">
        <canvas ref="chartCanvas" role="img" :aria-label="tf('neoX.dailyTransactions', 'Daily Transactions')"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import { statsService } from "@/services/neox";
import { getNeoxNet } from "@/utils/neoxEnv";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { formatInt } from "@/utils/neoxFormat";
import { getChartColors, baseTooltipConfig } from "@/utils/chartHelpers";

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const loading = ref(true);
const error = ref(false);
const points = ref([]);
const chartCanvas = ref(null);

let chartInstance = null;
let chartConstructorPromise = null;
let loadToken = 0;

function destroyChart() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}

async function getChartConstructor() {
  if (!chartConstructorPromise) {
    chartConstructorPromise = import("chart.js").then((mod) => mod.default);
  }
  return chartConstructorPromise;
}

function buildChartSeries() {
  // Blockscout returns newest-first; render oldest → newest left to right.
  const sorted = [...points.value].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return {
    labels: sorted.map((p) => String(p.date)),
    values: sorted.map((p) => Number(p.transactions_count) || 0),
  };
}

async function createChart() {
  if (!chartCanvas.value || points.value.length === 0) return;
  const Chart = await getChartConstructor();
  if (!chartCanvas.value) return;
  const ctx = chartCanvas.value.getContext("2d");
  const colors = getChartColors();
  const { labels, values } = buildChartSeries();

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: tf("neoX.dailyTransactions", "Daily Transactions"),
          data: values,
          fill: true,
          backgroundColor: "rgba(0, 229, 153, 0.08)",
          borderColor: "#00cc88",
          borderWidth: 2,
          lineTension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: "#00cc88",
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
          label: (item) =>
            `${tf("neoX.transactions", "Transactions")}: ${formatInt(Number(item.yLabel) || 0)}`,
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
              callback: (v) => formatInt(v),
            },
          },
        ],
      },
    },
  });
}

async function renderChart() {
  await nextTick();
  if (points.value.length === 0) {
    destroyChart();
    return;
  }

  if (chartInstance) {
    const { labels, values } = buildChartSeries();
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = values;
    chartInstance.update();
    return;
  }

  await createChart();
}

async function load() {
  const token = ++loadToken;
  // The skeleton branch replaces the canvas node while loading, so any live
  // chart instance is bound to a detached canvas — drop it before refetching.
  destroyChart();
  loading.value = true;
  error.value = false;
  try {
    const data = await statsService.getTxChart({ net: getNeoxNet() });
    if (token !== loadToken) return;
    points.value = Array.isArray(data) ? data : [];
  } catch (_err) {
    if (token !== loadToken) return;
    points.value = [];
    error.value = true;
    destroyChart();
  } finally {
    if (token === loadToken) loading.value = false;
  }
}

watch(points, () => {
  if (points.value.length > 0) {
    renderChart();
  } else {
    destroyChart();
  }
});

onMounted(load);
useNetworkChange(load);

onBeforeUnmount(() => {
  destroyChart();
});
</script>
