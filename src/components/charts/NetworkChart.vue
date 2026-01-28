<template>
  <div class="network-chart w-full h-full" ref="chartContainer">
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script>
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

export default {
  name: "NetworkChart",
  props: {
    type: {
      type: String,
      default: "transactions",
    },
    data: {
      type: Array,
      default: () => [],
    },
  },

  data() {
    return {
      chart: null,
    };
  },

  watch: {
    type() {
      this.updateChart();
    },
    data: {
      handler() {
        this.updateChart();
      },
      deep: true,
    },
  },

  mounted() {
    this.initChart();
  },

  beforeUnmount() {
    if (this.chart) {
      this.chart.destroy();
    }
  },

  methods: {
    initChart() {
      const ctx = this.$refs.chartCanvas.getContext("2d");
      const isDark = document.documentElement.classList.contains("dark");

      this.chart = new Chart(ctx, {
        type: "line",
        data: this.getChartData(),
        options: this.getChartOptions(isDark),
      });
    },

    updateChart() {
      if (this.chart) {
        this.chart.data = this.getChartData();
        this.chart.update();
      }
    },

    getChartData() {
      const labels = this.data.map((d) => this.formatDate(d.date));
      const values = this.data.map((d) => d[this.type] || 0);

      const colors = {
        transactions: { bg: "rgba(22, 93, 255, 0.1)", border: "#165DFF" },
        addresses: { bg: "rgba(0, 180, 42, 0.1)", border: "#00B42A" },
        gas: { bg: "rgba(255, 125, 0, 0.1)", border: "#FF7D00" },
      };

      const color = colors[this.type] || colors.transactions;

      return {
        labels,
        datasets: [
          {
            label: this.getLabel(),
            data: values,
            fill: true,
            backgroundColor: color.bg,
            borderColor: color.border,
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: color.border,
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
          },
        ],
      };
    },

    getChartOptions(isDark) {
      const textColor = isDark ? "#9CA3AF" : "#6B7280";
      const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";

      return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? "#1F2937" : "#fff",
            titleColor: isDark ? "#fff" : "#111827",
            bodyColor: isDark ? "#D1D5DB" : "#4B5563",
            borderColor: isDark ? "#374151" : "#E5E7EB",
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: (ctx) =>
                `${this.getLabel()}: ${ctx.parsed.y.toLocaleString()}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { size: 11 } },
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { size: 11 },
              callback: (value) => this.formatYAxis(value),
            },
          },
        },
      };
    },

    getLabel() {
      const labels = {
        transactions: "Transactions",
        addresses: "Active Addresses",
        gas: "GAS Used",
      };
      return labels[this.type] || "Value";
    },

    formatDate(dateStr) {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    },

    formatYAxis(value) {
      if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
      if (value >= 1000) return (value / 1000).toFixed(1) + "K";
      return value;
    },
  },
};
</script>
