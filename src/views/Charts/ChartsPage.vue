<template>
  <div class="charts-page min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Charts & Statistics
        </h1>
        <p class="text-gray-500">Neo N3 network analytics</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Daily Transactions -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Daily Transactions
          </h3>
          <div class="h-64">
            <NetworkChart type="transactions" :data="chartData" />
          </div>
        </div>

        <!-- Active Addresses -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Active Addresses
          </h3>
          <div class="h-64">
            <NetworkChart type="addresses" :data="chartData" />
          </div>
        </div>

        <!-- GAS Usage -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            GAS Usage
          </h3>
          <div class="h-64">
            <NetworkChart type="gas" :data="chartData" />
          </div>
        </div>

        <!-- Network Stats -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Network Overview
          </h3>
          <div class="space-y-4">
            <div class="flex justify-between">
              <span class="text-gray-500">Total Blocks</span>
              <span class="font-medium">{{ formatNumber(stats.blocks) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Total Transactions</span>
              <span class="font-medium">{{
                formatNumber(stats.transactions)
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Total Addresses</span>
              <span class="font-medium">{{
                formatNumber(stats.addresses)
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Total Contracts</span>
              <span class="font-medium">{{
                formatNumber(stats.contracts)
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import NetworkChart from "@/components/charts/NetworkChart.vue";
import { statsService } from "@/services";

export default {
  name: "ChartsPage",
  components: { NetworkChart },
  data() {
    return {
      chartData: [],
      stats: { blocks: 0, transactions: 0, addresses: 0, contracts: 0 },
    };
  },
  created() {
    this.loadData();
  },
  methods: {
    async loadData() {
      try {
        const [chart, overview] = await Promise.all([
          statsService.getChartData(),
          statsService.getOverview(),
        ]);
        this.chartData = chart || [];
        this.stats = overview || this.stats;
      } catch (e) {
        console.error("Failed to load stats:", e);
      }
    },
    formatNumber(n) {
      return n ? n.toLocaleString() : "0";
    },
  },
};
</script>
