<template>
  <div class="relative inline-flex flex-col items-center" ref="wrapperRef">
    <canvas ref="canvasRef" :width="size" :height="size" class="drop-shadow-lg"></canvas>
    <div
      class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
    >
      <span class="text-2xl font-extrabold text-high tabular-nums leading-none neon-glow-text-strong">
        {{ displayCount }}
      </span>
      <span class="text-[10px] text-mid font-medium uppercase tracking-wider mt-0.5">
        {{ label }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from "vue";
import { useCountUp } from "@/composables/useCountUp";
import { isDarkMode } from "@/utils/chartHelpers";

const props = defineProps({
  /** 已确认数 */
  confirmed: { type: Number, default: 0 },
  /** 目标确认数（满值为 100% 的基数，默认 15） */
  target: { type: Number, default: 15 },
  /** 标签文字 */
  label: { type: String, default: "Confirmations" },
  /** Canvas 尺寸 */
  size: { type: Number, default: 120 },
});

const canvasRef = ref(null);
const wrapperRef = ref(null);
let chart = null;
let colorObserver = null;

const countRef = computed(() => props.confirmed || 0);
const { display: displayCount } = useCountUp(countRef, {
  duration: 1500,
  decimals: 0,
  easing: "easeOut",
});

function getProgress() {
  return Math.min((props.confirmed || 0) / Math.max(props.target || 1, 1), 1);
}

async function createChart() {
  if (!canvasRef.value) return;
  const ChartModule = await import("chart.js");
  const Chart = ChartModule.default;

  const dark = isDarkMode();
  const progress = getProgress();
  const remaining = 1 - progress;

  const ringColor = dark ? "#00E599" : "#00cc88";
  const trackColor = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const glowGradient = canvasRef.value.getContext("2d");
  if (glowGradient) {
    const g = glowGradient.createLinearGradient(0, 0, props.size, props.size);
    g.addColorStop(0, "#00E599");
    g.addColorStop(1, "#00cc88");
  }

  chart = new Chart(canvasRef.value, {
    type: "doughnut",
    data: {
      datasets: [
        {
          data: [progress, remaining],
          backgroundColor: [ringColor, trackColor],
          borderWidth: 0,
          borderRadius: progress >= 1 ? 0 : 4,
        },
      ],
    },
    options: {
      cutoutPercentage: 75,
      responsive: false,
      maintainAspectRatio: false,
      animation: {
        duration: 1500,
        easing: "easeOutQuart",
      },
      tooltips: { enabled: false },
      hover: { mode: null },
      legend: { display: false },
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

  // Observe dark mode changes
  colorObserver = new MutationObserver(() => {
    refreshChart();
  });
  colorObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
});

onBeforeUnmount(() => {
  destroyChart();
  if (colorObserver) colorObserver.disconnect();
});

watch(() => props.confirmed, () => {
  if (chart && chart.data && chart.data.datasets) {
    const progress = getProgress();
    chart.data.datasets[0].data = [progress, 1 - progress];
    chart.update();
  }
});
</script>
