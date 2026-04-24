<template>
  <div class="network-chart w-full h-full" ref="chartContainer">
    <template v-if="loading">
      <div class="space-y-2">
        <Skeleton v-for="i in 5" :key="i" height="44px" />
      </div>
    </template>
    <template v-else-if="error">
      <ErrorState title="Failed to load chart" :message="error" @retry="$emit('retry')" />
    </template>
    <template v-else-if="!data || data.length === 0">
      <div class="flex h-full items-center justify-center py-12">
        <p class="text-sm text-mid">No data available</p>
      </div>
    </template>
    <template v-else>
      <canvas ref="chartCanvas" role="img" aria-label="Network activity chart"></canvas>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { useTheme } from "@/composables/useTheme";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";

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
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: null,
  },
});

defineEmits(["retry"]);

const { isDark } = useTheme();
const chartContainer = ref(null);
const chartCanvas = ref(null);
const chart = ref(null);

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

async function initChart() {
  if (!chartCanvas.value || !props.data || props.data.length === 0) return;
  const Chart = (await import("chart.js")).default;
  const ctx = chartCanvas.value.getContext("2d");

  chart.value = new Chart(ctx, {
    type: "line",
    data: getChartData(),
    options: getChartOptions(isDark.value),
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
    if (chart.value) {
      updateChart();
    } else {
      initChart();
    }
  },
);

watch(
  () => props.data,
  () => {
    if (chart.value) {
      updateChart();
    } else {
      initChart();
    }
  },
);

watch(isDark, () => {
  if (chart.value) {
    chart.value.options = getChartOptions(isDark.value);
    chart.value.update();
  }
});

onMounted(() => {
  initChart();
});

onBeforeUnmount(() => {
  if (chart.value) {
    chart.value.destroy();
  }
});
</script>
