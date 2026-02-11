<template>
  <div class="network-chart w-full h-full" ref="chartContainer">
    <canvas ref="chartCanvas" role="img" aria-label="Network activity chart"></canvas>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import Chart from "chart.js";

const props = defineProps({
  type: {
    type: String,
    default: "transactions",
    validator: (v) => ["transactions", "addresses", "gas"].includes(v),
  },
  data: {
    type: Array,
    default: () => [],
  },
});

const chartContainer = ref(null);
const chartCanvas = ref(null);
const chart = ref(null);
let themeObserver = null;

function getLabel() {
  const labels = {
    transactions: "Transactions",
    addresses: "Active Addresses",
    gas: "GAS Used",
  };
  return labels[props.type] || "Value";
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatYAxis(value) {
  if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
  if (value >= 1000) return (value / 1000).toFixed(1) + "K";
  return value;
}

function getChartData() {
  const labels = props.data.map((d) => formatDate(d.date));
  const values = props.data.map((d) => d[props.type] || 0);

  const colors = {
    transactions: { bg: "rgba(22, 93, 255, 0.1)", border: "#165DFF" },
    addresses: { bg: "rgba(0, 180, 42, 0.1)", border: "#00B42A" },
    gas: { bg: "rgba(255, 125, 0, 0.1)", border: "#FF7D00" },
  };

  const color = colors[props.type] || colors.transactions;

  return {
    labels,
    datasets: [
      {
        label: getLabel(),
        data: values,
        fill: true,
        backgroundColor: color.bg,
        borderColor: color.border,
        borderWidth: 2,
        lineTension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: color.border,
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ],
  };
}

function getChartOptions(isDark) {
  const textColor = isDark ? "#9CA3AF" : "#6B7280";
  const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";

  return {
    responsive: true,
    maintainAspectRatio: false,
    tooltips: {
      mode: "index",
      intersect: false,
      backgroundColor: isDark ? "#1F2937" : "#fff",
      titleFontColor: isDark ? "#fff" : "#111827",
      bodyFontColor: isDark ? "#D1D5DB" : "#4B5563",
      borderColor: isDark ? "#374151" : "#E5E7EB",
      borderWidth: 1,
      xPadding: 12,
      yPadding: 12,
      displayColors: false,
      callbacks: {
        label: (tooltipItem) => `${getLabel()}: ${tooltipItem.yLabel.toLocaleString()}`,
      },
    },
    legend: { display: false },
    scales: {
      xAxes: [
        {
          gridLines: { display: false },
          ticks: { fontColor: textColor, fontSize: 11 },
        },
      ],
      yAxes: [
        {
          gridLines: { color: gridColor },
          ticks: {
            fontColor: textColor,
            fontSize: 11,
            callback: (value) => formatYAxis(value),
          },
        },
      ],
    },
  };
}

function initChart() {
  if (!chartCanvas.value) return;
  const ctx = chartCanvas.value.getContext("2d");
  const isDark = document.documentElement.classList.contains("dark");

  chart.value = new Chart(ctx, {
    type: "line",
    data: getChartData(),
    options: getChartOptions(isDark),
  });
}

function updateChart() {
  if (chart.value) {
    chart.value.data = getChartData();
    chart.value.update();
  }
}

watch(
  () => props.type,
  () => {
    updateChart();
  }
);

watch(
  () => props.data,
  () => {
    updateChart();
  },
  { deep: true }
);

onMounted(() => {
  initChart();

  themeObserver = new MutationObserver(() => {
    if (chart.value) {
      const isDark = document.documentElement.classList.contains("dark");
      chart.value.options = getChartOptions(isDark);
      chart.value.update();
    }
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
});

onBeforeUnmount(() => {
  if (themeObserver) {
    themeObserver.disconnect();
    themeObserver = null;
  }
  if (chart.value) {
    chart.value.destroy();
  }
});
</script>
