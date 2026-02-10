<template>
  <div class="burn-fee-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <header class="mb-5 flex flex-col gap-1">
        <h1 class="text-2xl font-semibold text-text-primary dark:text-gray-100">GAS Burn Statistics</h1>
        <p class="text-sm text-text-secondary dark:text-gray-400">Estimated fee burn insights from network activity</p>
      </header>

      <div class="grid gap-4 md:grid-cols-3">
        <div class="etherscan-card p-4">
          <p class="text-xs uppercase tracking-wide text-text-secondary">Total Transactions</p>
          <p class="mt-2 text-2xl font-semibold text-text-primary dark:text-gray-100">
            {{ formatNumber(stats.txs) }}
          </p>
        </div>

        <div class="etherscan-card p-4">
          <p class="text-xs uppercase tracking-wide text-text-secondary">Estimated GAS Burned</p>
          <p class="mt-2 text-2xl font-semibold text-text-primary dark:text-gray-100">{{ estimatedBurn }} GAS</p>
        </div>

        <div class="etherscan-card p-4">
          <p class="text-xs uppercase tracking-wide text-text-secondary">Estimated Burn / Tx</p>
          <p class="mt-2 text-2xl font-semibold text-text-primary dark:text-gray-100">{{ burnPerTx }} GAS</p>
        </div>
      </div>

      <div class="mt-4 etherscan-card p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold text-text-primary dark:text-gray-100">Daily Activity Trend</h2>
            <p class="text-sm text-text-secondary dark:text-gray-400">
              Use the chart explorer for 14/30 day detail view.
            </p>
          </div>
          <router-link
            to="/echarts"
            class="rounded-md bg-primary-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            Open Daily Chart
          </router-link>
        </div>
      </div>

      <div v-if="loading" class="mt-4 space-y-2">
        <Skeleton v-for="index in 4" :key="index" height="44px" />
      </div>

      <div v-else-if="error" class="mt-4">
        <ErrorState title="Failed to load burn metrics" :message="error" @retry="loadData" />
      </div>
    </section>
  </div>
</template>

<script>
import { statsService } from "@/services";
import { BURN_RATE } from "@/constants";
import { formatNumber } from "@/utils/explorerFormat";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";

export default {
  name: "BurnFee",
  components: {
    Skeleton,
    ErrorState,
  },
  data() {
    return {
      loading: true,
      error: null,
      stats: {
        txs: 0,
      },
    };
  },
  computed: {
    estimatedBurn() {
      const txs = Number(this.stats.txs || 0);
      return (txs * BURN_RATE).toFixed(2);
    },
    burnPerTx() {
      return String(BURN_RATE);
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
        this.stats = await statsService.getDashboardStats();
      } catch {
        this.error = "Unable to load burn metrics.";
      } finally {
        this.loading = false;
      }
    },
    formatNumber,
  },
};
</script>
