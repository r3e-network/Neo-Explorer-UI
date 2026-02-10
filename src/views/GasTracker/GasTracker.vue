<template>
  <div class="gas-tracker-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <!-- Breadcrumb -->
      <BreadcrumbNav :items="[{ label: 'Home', to: '/homepage' }, { label: 'Gas Tracker' }]" />

      <!-- Page Header -->
      <div class="mb-6 flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-text-primary dark:text-gray-100">Neo N3 Gas Tracker</h1>
          <p class="text-sm text-text-secondary dark:text-gray-400">
            Real-time network fee estimates and GAS analytics
          </p>
        </div>
      </div>

      <!-- Fee Stats Cards -->
      <div v-if="loading" class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton v-for="i in 3" :key="i" height="120px" variant="rounded" />
      </div>

      <div v-else class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <!-- Low Fee -->
        <div class="etherscan-card p-5">
          <div class="mb-2 flex items-center gap-2">
            <span
              class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span class="text-sm font-medium text-text-secondary dark:text-gray-400">Low</span>
          </div>
          <p class="text-2xl font-bold text-text-primary dark:text-gray-100">
            {{ formatGas(feeEstimates.low) }}
          </p>
          <p class="mt-1 text-xs text-text-muted dark:text-gray-500">GAS / transaction</p>
        </div>

        <!-- Average Fee -->
        <div class="etherscan-card border-primary-200 p-5 dark:border-primary-800">
          <div class="mb-2 flex items-center gap-2">
            <span
              class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </span>
            <span class="text-sm font-medium text-text-secondary dark:text-gray-400">Average</span>
          </div>
          <p class="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {{ formatGas(feeEstimates.average) }}
          </p>
          <p class="mt-1 text-xs text-text-muted dark:text-gray-500">GAS / transaction</p>
        </div>

        <!-- High Fee -->
        <div class="etherscan-card p-5">
          <div class="mb-2 flex items-center gap-2">
            <span
              class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                />
              </svg>
            </span>
            <span class="text-sm font-medium text-text-secondary dark:text-gray-400">High</span>
          </div>
          <p class="text-2xl font-bold text-text-primary dark:text-gray-100">
            {{ formatGas(feeEstimates.high) }}
          </p>
          <p class="mt-1 text-xs text-text-muted dark:text-gray-500">GAS / transaction</p>
        </div>
      </div>

      <!-- Latest Fee Summary -->
      <div class="etherscan-card mb-6 p-5">
        <h2 class="mb-3 text-base font-semibold text-text-primary dark:text-gray-200">Latest Fee Summary</h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
            <p class="text-xs font-medium uppercase tracking-wide text-text-muted dark:text-gray-500">
              Latest System Fee
            </p>
            <p class="mt-1 text-lg font-semibold text-text-primary dark:text-gray-200">
              {{ formatGas(gasData.latestSystemFee) }} GAS
            </p>
          </div>
          <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
            <p class="text-xs font-medium uppercase tracking-wide text-text-muted dark:text-gray-500">
              Latest Network Fee
            </p>
            <p class="mt-1 text-lg font-semibold text-text-primary dark:text-gray-200">
              {{ formatGas(gasData.latestNetworkFee) }} GAS
            </p>
          </div>
        </div>
      </div>

      <!-- Recent Blocks with Fee Data -->
      <div class="etherscan-card overflow-hidden">
        <div
          class="flex items-center justify-between border-b border-card-border px-4 py-3 dark:border-card-border-dark"
        >
          <h2 class="text-sm font-semibold text-text-primary dark:text-gray-200">Recent Blocks - Fee Data</h2>
          <button @click="loadData" class="text-xs text-primary-500 hover:text-primary-600 dark:text-primary-400">
            Refresh
          </button>
        </div>

        <!-- Loading -->
        <div v-if="blocksLoading" class="space-y-2 p-4">
          <Skeleton v-for="i in 6" :key="i" height="44px" />
        </div>

        <!-- Error -->
        <div v-else-if="blocksError" class="p-4">
          <ErrorState title="Failed to load block fee data" :message="blocksError" @retry="loadBlocks" />
        </div>

        <!-- Empty -->
        <div v-else-if="!blocks.length" class="p-4">
          <EmptyState message="No block data available" icon="block" />
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[700px]">
            <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">Block #</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">Txn Count</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary">System Fee</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary">Network Fee</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary">Total Fee</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
              <tr
                v-for="block in blocks"
                :key="block.hash"
                class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <td class="px-4 py-3">
                  <router-link :to="`/block-info/${block.hash}`" class="font-medium etherscan-link">
                    {{ formatNumber(block.index) }}
                  </router-link>
                </td>
                <td class="px-4 py-3 text-sm text-text-primary dark:text-gray-300">
                  {{ block.txcount || 0 }}
                </td>
                <td class="px-4 py-3 text-right text-sm text-text-primary dark:text-gray-300">
                  {{ formatGas(block.sysfee || 0) }}
                </td>
                <td class="px-4 py-3 text-right text-sm text-text-primary dark:text-gray-300">
                  {{ formatGas(block.netfee || 0) }}
                </td>
                <td class="px-4 py-3 text-right text-sm font-medium text-text-primary dark:text-gray-200">
                  {{ formatGas(totalFee(block)) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Fee Trend Info -->
      <div class="etherscan-card mt-6 p-5">
        <h2 class="mb-2 text-base font-semibold text-text-primary dark:text-gray-200">About Neo N3 Fees</h2>
        <div class="space-y-2 text-sm leading-relaxed text-text-secondary dark:text-gray-400">
          <p>
            Neo N3 transactions incur two types of fees:
            <strong class="text-text-primary dark:text-gray-300">System Fee</strong> (consumed for on-chain operations
            like contract invocations) and
            <strong class="text-text-primary dark:text-gray-300">Network Fee</strong> (paid to Consensus Nodes for
            transaction verification and inclusion).
          </p>
          <p>
            Unlike Ethereum's variable gas pricing, Neo N3 fees are deterministic and based on the computational
            resources consumed. The Network Fee is partially burned at a rate of
            {{ BURN_RATE }} GAS per byte, contributing to GAS deflation.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import BreadcrumbNav from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import { statsService, blockService } from "@/services";
import { formatNumber } from "@/utils/explorerFormat";
import { GAS_DIVISOR, BURN_RATE } from "@/constants";

export default {
  name: "GasTracker",

  components: { BreadcrumbNav, Skeleton, ErrorState, EmptyState },

  data() {
    return {
      loading: true,
      blocksLoading: true,
      blocksError: null,
      gasData: {
        latestNetworkFee: "0",
        latestSystemFee: "0",
        networkFee: null,
      },
      feeEstimates: { low: 0, average: 0, high: 0 },
      blocks: [],
      BURN_RATE,
    };
  },

  created() {
    this.loadData();
  },

  methods: {
    formatGas(value) {
      if (!value) return "0.00000000";
      return (Number(value) / GAS_DIVISOR).toFixed(8);
    },

    formatNumber,

    totalFee(block) {
      return (Number(block.sysfee) || 0) + (Number(block.netfee) || 0);
    },

    async loadData() {
      await Promise.all([this.loadGasTracker(), this.loadBlocks()]);
    },

    async loadGasTracker() {
      this.loading = true;
      try {
        const data = await statsService.getGasTracker();
        this.gasData = data;
        this.computeFeeEstimates();
      } catch (e) {
        console.error("Gas tracker load failed:", e);
      } finally {
        this.loading = false;
      }
    },

    async loadBlocks() {
      this.blocksLoading = true;
      this.blocksError = null;
      try {
        const res = await blockService.getList(15, 0);
        this.blocks = res?.result || [];
        this.computeFeeEstimates();
      } catch (e) {
        this.blocksError = e.message || "Failed to load blocks";
      } finally {
        this.blocksLoading = false;
      }
    },

    computeFeeEstimates() {
      const feeBearing = this.blocks.filter((b) => (Number(b.netfee) || 0) + (Number(b.sysfee) || 0) > 0);
      if (!feeBearing.length) {
        this.feeEstimates = { low: 0, average: 0, high: 0 };
        return;
      }

      const fees = feeBearing.map((b) => (Number(b.netfee) || 0) + (Number(b.sysfee) || 0));
      fees.sort((a, b) => a - b);

      const low = fees[0];
      const high = fees[fees.length - 1];
      const average = Math.round(fees.reduce((s, f) => s + f, 0) / fees.length);

      this.feeEstimates = { low, average, high };
    },
  },
};
</script>
