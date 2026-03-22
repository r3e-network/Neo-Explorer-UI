<template>
  <div class="etherscan-card mb-6 p-5">
    <h2 class="text-high mb-1 text-base font-semibold">Fee Trend</h2>
    <p class="text-low mb-4 text-xs">Average total fee per block from the last 20 blocks</p>
    <div v-if="loading" class="space-y-2">
      <Skeleton v-for="i in 4" :key="i" height="44px" />
    </div>
    <div v-else-if="blocks.length" class="h-[280px]">
      <canvas ref="feeTrendCanvas"></canvas>
    </div>
    <div v-else class="text-low py-8 text-center text-sm">No block data available for chart</div>
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, nextTick } from "vue";
import Skeleton from "@/components/common/Skeleton.vue";
import { GAS_DIVISOR } from "@/constants";
import { getChartColors, baseTooltipConfig } from "@/utils/chartHelpers";

const props = defineProps({
  blocks: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const feeTrendCanvas = ref(null);
let feeTrendChart = null;
let chartConstructorPromise = null;

function totalFee(block) {
  return (Number(block.sysfee) || 0) + (Number(block.netfee) || 0);
}

function destroyChart() {
  if (feeTrendChart) {
    feeTrendChart.destroy();
    feeTrendChart = null;
  }
}

async function getChartConstructor() {
  if (!chartConstructorPromise) {
    chartConstructorPromise = import("chart.js").then((mod) => mod.default);
  }
  return chartConstructorPromise;
}

function buildChartSeries() {
  const sorted = [...props.blocks].reverse();
  return {
    labels: sorted.map((b) => `#${Number(b.index).toLocaleString()}`),
    values: sorted.map((b) => totalFee(b) / GAS_DIVISOR),
  };
}

async function createFeeTrendChart() {
  if (!feeTrendCanvas.value || !props.blocks.length) return;
  const Chart = await getChartConstructor();
  const ctx = feeTrendCanvas.value.getContext("2d");
  const colors = getChartColors();
  const { labels, values } = buildChartSeries();

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
        ...baseTooltipConfig(colors),
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

async function renderChart() {
  await nextTick();
  if (!props.blocks.length) {
    destroyChart();
    return;
  }

  const { labels, values } = buildChartSeries();
  if (feeTrendChart) {
    feeTrendChart.data.labels = labels;
    feeTrendChart.data.datasets[0].data = values;
    feeTrendChart.update();
    return;
  }

  await createFeeTrendChart();
}

watch(
  () => props.blocks,
  (newBlocks) => {
    if (newBlocks && newBlocks.length) {
      renderChart();
    } else {
      destroyChart();
    }
  },
);

onBeforeUnmount(() => {
  destroyChart();
});
</script>
