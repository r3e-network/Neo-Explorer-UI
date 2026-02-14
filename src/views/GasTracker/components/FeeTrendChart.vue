<template>
  <div class="etherscan-card mb-6 p-5">
    <h2 class="mb-1 text-base font-semibold text-text-primary dark:text-gray-200">Fee Trend</h2>
    <p class="mb-4 text-xs text-text-muted dark:text-gray-500">Average total fee per block from the last 20 blocks</p>
    <div v-if="loading" class="space-y-2">
      <Skeleton v-for="i in 4" :key="i" height="44px" />
    </div>
    <div v-else-if="blocks.length" class="h-[280px]">
      <canvas ref="feeTrendCanvas"></canvas>
    </div>
    <div v-else class="py-8 text-center text-sm text-text-muted dark:text-gray-500">
      No block data available for chart
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, nextTick } from "vue";
import Skeleton from "@/components/common/Skeleton.vue";
import { GAS_DIVISOR } from "@/constants";

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

function totalFee(block) {
  return (Number(block.sysfee) || 0) + (Number(block.netfee) || 0);
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

function destroyChart() {
  if (feeTrendChart) {
    feeTrendChart.destroy();
    feeTrendChart = null;
  }
}

function createFeeTrendChart(Chart) {
  if (!feeTrendCanvas.value || !props.blocks.length) return;
  destroyChart();

  const ctx = feeTrendCanvas.value.getContext("2d");
  const colors = getChartColors();

  const sorted = [...props.blocks].reverse();
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

async function renderChart() {
  destroyChart();
  const { default: ChartJS } = await import("chart.js");
  await nextTick();
  createFeeTrendChart(ChartJS);
}

watch(
  () => props.blocks,
  (newBlocks) => {
    if (newBlocks && newBlocks.length) {
      renderChart();
    } else {
      destroyChart();
    }
  }
);

onBeforeUnmount(() => {
  destroyChart();
});
</script>
