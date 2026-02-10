<template>
  <div class="daily-transaction-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <header class="mb-5 flex flex-col gap-1">
        <h1 class="text-2xl font-semibold text-text-primary dark:text-gray-100">Daily Transactions</h1>
        <p class="text-sm text-text-secondary dark:text-gray-400">Network activity trend for Neo N3</p>
      </header>

      <div class="etherscan-card p-4">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div class="flex gap-2">
            <button
              v-for="option in dayOptions"
              :key="option"
              class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              :class="
                selectedDays === option
                  ? 'bg-primary-50 text-primary-500 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'bg-gray-100 text-text-secondary hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              "
              @click="selectedDays = option"
            >
              {{ option }} days
            </button>
          </div>

          <div class="text-sm text-text-secondary dark:text-gray-400">
            Average / day:
            <span class="font-medium text-text-primary dark:text-gray-200">{{ formatNumber(avgTx) }}</span>
          </div>
        </div>

        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="index in 5" :key="index" height="44px" />
        </div>

        <div v-else-if="error" class="py-2">
          <ErrorState title="Failed to load transaction chart" :message="error" @retry="loadData" />
        </div>

        <div v-else>
          <div class="h-[360px]">
            <NetworkChart type="transactions" :data="chartData" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { statsService } from "@/services";
import NetworkChart from "@/components/charts/NetworkChart.vue";
import { formatNumber } from "@/utils/explorerFormat";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";

function formatDayOffset(offset) {
  const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
  return date.toISOString().split("T")[0];
}

export default {
  name: "DailyTransaction",
  components: {
    NetworkChart,
    Skeleton,
    ErrorState,
  },
  data() {
    return {
      loading: true,
      error: null,
      selectedDays: 14,
      dayOptions: [14, 30],
      chartData: [],
    };
  },
  computed: {
    avgTx() {
      if (!this.chartData.length) return 0;
      const total = this.chartData.reduce((sum, item) => sum + (item.transactions || 0), 0);
      return Math.round(total / this.chartData.length);
    },
  },
  watch: {
    selectedDays() {
      this.loadData();
    },
  },
  created() {
    this.loadData();
  },
  methods: {
    async loadData() {
      this.loading = true;
      this.error = null;
      try {
        const raw = await statsService.getNetworkActivity(this.selectedDays);
        this.chartData = this.normalizeChartData(raw, this.selectedDays);
      } catch {
        this.error = "Failed to load chart data.";
      } finally {
        this.loading = false;
      }
    },
    normalizeChartData(raw, days) {
      const list = Array.isArray(raw) ? raw : [];
      if (!list.length) {
        return Array.from({ length: days }, (_, index) => ({
          date: formatDayOffset(days - index - 1),
          transactions: 0,
          addresses: 0,
          gas: 0,
        }));
      }

      const mapped = list.map((entry, index) => {
        const date = entry?.date || entry?.Date || entry?.day || entry?.Day || formatDayOffset(list.length - index - 1);

        return {
          date,
          transactions: Number(
            entry?.transactions ?? entry?.DailyTransactions ?? entry?.dailyTransactions ?? entry?.txs ?? 0
          ),
          addresses: Number(entry?.addresses ?? entry?.activeAddresses ?? 0),
          gas: Number(entry?.gas ?? entry?.gasUsed ?? 0),
        };
      });

      if (mapped.length > 1 && mapped[0].date > mapped[mapped.length - 1].date) {
        mapped.reverse();
      }

      return mapped;
    },
    formatNumber,
  },
};
</script>
