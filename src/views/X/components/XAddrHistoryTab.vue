<template>
  <div class="etherscan-card overflow-hidden">
    <div class="card-header">
      <h2 class="text-high text-base font-semibold">{{ tf("neoX.balanceHistory", "Balance History") }}</h2>
    </div>

    <div v-if="loading" class="space-y-2 p-4">
      <Skeleton v-for="i in 6" :key="i" height="32px" />
    </div>

    <div v-else-if="error" class="p-6">
      <ErrorState
        :title="tf('errors.loadFailed', 'Failed to load data.')"
        :message="tf('neoX.loadHistoryError', 'Unable to load balance history.')"
        @retry="load"
      />
    </div>

    <EmptyState v-else-if="points.length === 0" :message="tf('neoX.noHistory', 'No balance history')" />

    <div v-else class="p-4">
      <div class="h-[280px]">
        <canvas ref="chartCanvas"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { accountService } from "@/services/neox";
import { getNeoxNet } from "@/utils/neoxEnv";
import { getChartColors, baseTooltipConfig } from "@/utils/chartHelpers";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";

const props = defineProps({
  address: { type: String, required: true },
});

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const points = ref([]);
const loading = ref(false);
const error = ref(false);
const chartCanvas = ref(null);
let chart = null;
let chartConstructorPromise = null;
let reqId = 0;

const GAS_WEI = 1e18;

async function load() {
  const current = ++reqId;
  loading.value = true;
  error.value = false;
  try {
    const items = await accountService.getCoinBalanceHistory(props.address, { net: getNeoxNet() });
    if (current !== reqId) return;
    points.value = [...items].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  } catch (_err) {
    if (current === reqId) error.value = true;
  } finally {
    if (current === reqId) loading.value = false;
  }
}

function destroyChart() {
  if (chart) {
    chart.destroy();
    chart = null;
  }
}

async function getChartConstructor() {
  if (!chartConstructorPromise) {
    chartConstructorPromise = import("chart.js").then((mod) => mod.default);
  }
  return chartConstructorPromise;
}

function buildSeries() {
  return {
    labels: points.value.map((p) => p.date),
    values: points.value.map((p) => Number(p.value) / GAS_WEI),
  };
}

async function createChart() {
  if (!chartCanvas.value || !points.value.length) return;
  const Chart = await getChartConstructor();
  if (!chartCanvas.value) return;
  const ctx = chartCanvas.value.getContext("2d");
  const colors = getChartColors();
  const { labels, values } = buildSeries();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: tf("neoX.balanceGas", "Balance (GAS)"),
          data: values,
          fill: true,
          backgroundColor: "rgba(0, 229, 153, 0.08)",
          borderColor: "#00b377",
          borderWidth: 2,
          lineTension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointBackgroundColor: "#00b377",
          pointBorderColor: "#fff",
          pointBorderWidth: 1,
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
          label: (item) => `${Number(item.yLabel).toLocaleString("en-US", { maximumFractionDigits: 6 })} GAS`,
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
              callback: (v) => Number(v).toLocaleString("en-US", { maximumFractionDigits: 4 }),
            },
          },
        ],
      },
    },
  });
}

async function renderChart() {
  await nextTick();
  if (!points.value.length) {
    destroyChart();
    return;
  }
  const { labels, values } = buildSeries();
  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    chart.update();
    return;
  }
  await createChart();
}

watch(points, () => renderChart());
watch(
  () => props.address,
  () => {
    destroyChart();
    load();
  }
);

onMounted(load);
useNetworkChange(load);

onBeforeUnmount(() => {
  destroyChart();
});
</script>
