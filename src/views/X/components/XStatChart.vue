<template>
  <div class="etherscan-card overflow-hidden" :data-testid="`x-stat-chart-${lineId}`">
    <div class="card-header">
      <div>
        <h2 class="text-high text-base font-semibold">{{ title }}</h2>
        <p v-if="subtitle" class="text-mid mt-1 text-xs">{{ subtitle }}</p>
      </div>
      <div v-if="points.length > RANGE_90" class="flex items-center gap-1">
        <button
          type="button"
          class="tab-btn"
          :class="range === '90d' ? 'tab-btn-active' : 'tab-btn-inactive'"
          :aria-pressed="range === '90d'"
          @click="range = '90d'"
        >
          {{ tf("neoX.chartRange90d", "90d") }}
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="range === 'all' ? 'tab-btn-active' : 'tab-btn-inactive'"
          :aria-pressed="range === 'all'"
          @click="range = 'all'"
        >
          {{ tf("neoX.chartRangeAll", "All") }}
        </button>
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
        <canvas ref="chartCanvas" role="img" :aria-label="title"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import { statsService } from "@/services/neox";
import { getNeoxNet } from "@/utils/neoxEnv";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { getChartColors, baseTooltipConfig } from "@/utils/chartHelpers";

const props = defineProps({
  lineId: { type: String, required: true },
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  valueSuffix: { type: String, default: "" },
  decimals: { type: Number, default: 2 },
});

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const RANGE_90 = 90;

const loading = ref(true);
const error = ref(false);
const points = ref([]);
const range = ref("90d");
const chartCanvas = ref(null);

let chartInstance = null;
let chartConstructorPromise = null;
let loadToken = 0;

// getChartLine returns ascending [{ date, value }] — default view is the tail.
const visiblePoints = computed(() =>
  range.value === "all" ? points.value : points.value.slice(-RANGE_90),
);

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

function formatValue(value) {
  const num = Number(value) || 0;
  return num.toLocaleString("en-US", { maximumFractionDigits: props.decimals });
}

function formatTick(value) {
  const num = Number(value) || 0;
  const abs = Math.abs(num);
  if (abs >= 1e12) return `${(num / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  return formatValue(num);
}

function buildChartSeries() {
  const rows = visiblePoints.value;
  return {
    labels: rows.map((p) => String(p.date)),
    values: rows.map((p) => Number(p.value) || 0),
  };
}

async function createChart() {
  if (!chartCanvas.value || visiblePoints.value.length === 0) return;
  const Chart = await getChartConstructor();
  // Re-check after the await: a concurrent renderChart may have created the
  // instance already — a second new Chart on the same canvas would leak it.
  if (!chartCanvas.value || chartInstance) return;
  const ctx = chartCanvas.value.getContext("2d");
  const colors = getChartColors();
  const { labels, values } = buildChartSeries();

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: props.title,
          data: values,
          fill: true,
          backgroundColor: "rgba(0, 229, 153, 0.08)",
          borderColor: "#00cc88",
          borderWidth: 2,
          lineTension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 5,
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
          label: (item) => `${formatValue(item.yLabel)}${props.valueSuffix}`,
        },
      },
      scales: {
        xAxes: [
          {
            gridLines: { display: false },
            ticks: { fontColor: colors.text, fontSize: 10, maxTicksLimit: 8 },
          },
        ],
        yAxes: [
          {
            gridLines: { color: colors.grid, drawBorder: false },
            ticks: {
              fontColor: colors.text,
              fontSize: 11,
              beginAtZero: true,
              callback: (v) => formatTick(v),
            },
          },
        ],
      },
    },
  });
}

async function renderChart() {
  await nextTick();
  if (visiblePoints.value.length === 0) {
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
    const data = await statsService.getChartLine(props.lineId, { net: getNeoxNet() });
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

watch(visiblePoints, () => {
  if (visiblePoints.value.length > 0) {
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
