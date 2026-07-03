<template>
  <div class="sparkline-wrapper" :style="{ width: width + 'px', height: height + 'px' }">
    <canvas ref="canvasRef" :width="width" :height="height"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { isDarkMode } from "@/utils/chartHelpers";

const props = defineProps({
  /** 数据点数组 */
  data: { type: Array, default: () => [] },
  /** 宽度 */
  width: { type: Number, default: 120 },
  /** 高度 */
  height: { type: Number, default: 36 },
  /** 线条颜色（默认品牌色） */
  color: { type: String, default: "" },
  /** 是否显示填充区域 */
  fill: { type: Boolean, default: true },
  /** 是否有动画 */
  animated: { type: Boolean, default: true },
});

const canvasRef = ref(null);
let chart = null;
let colorObserver = null;

function getLineColor() {
  if (props.color) return props.color;
  return isDarkMode() ? "#00E599" : "#00cc88";
}

function getFillColor() {
  return isDarkMode()
    ? "rgba(0, 229, 153, 0.08)"
    : "rgba(0, 204, 136, 0.12)";
}

async function createChart() {
  if (!canvasRef.value || !props.data || props.data.length < 2) return;
  const ChartModule = await import("chart.js");
  const Chart = ChartModule.default;

  const labels = props.data.map((_, i) => i);
  const values = props.data.map((d) => (typeof d === "number" ? d : d?.value ?? 0));

  chart = new Chart(canvasRef.value, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          data: values,
          borderColor: getLineColor(),
          backgroundColor: props.fill ? getFillColor() : "transparent",
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: getLineColor(),
          tension: 0.4,
          fill: props.fill,
        },
      ],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: {
        duration: props.animated ? 1200 : 0,
        easing: "easeInOutQuart",
      },
      tooltips: { enabled: false },
      hover: { mode: "index", intersect: false },
      legend: { display: false },
      scales: {
        xAxes: [{ display: false }],
        yAxes: [{ display: false, ticks: { beginAtZero: false } }],
      },
      layout: {
        padding: { top: 2, bottom: 2 },
      },
    },
  });
}

function destroyChart() {
  if (chart) {
    chart.destroy();
    chart = null;
  }
}

function refreshChart() {
  destroyChart();
  createChart();
}

onMounted(() => {
  createChart();
  colorObserver = new MutationObserver(() => refreshChart());
  colorObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
});

onBeforeUnmount(() => {
  destroyChart();
  if (colorObserver) colorObserver.disconnect();
});

watch(
  () => props.data,
  () => refreshChart(),
  { deep: true }
);
</script>

<style scoped>
.sparkline-wrapper {
  display: inline-block;
  vertical-align: middle;
}
</style>
