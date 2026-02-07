<template>
  <div class="home-page">
    <section class="hero-section bg-header-bg relative overflow-hidden">
      <div class="hero-overlay"></div>
      <div class="mx-auto max-w-[1400px] px-4 py-10 md:py-14 relative z-10">
        <div class="max-w-3xl">
          <h1 class="text-3xl font-semibold text-white md:text-4xl">The Neo N3 Blockchain Explorer</h1>

          <form class="mt-5" @submit.prevent="handleSearch(searchValue)">
            <div
              class="flex flex-col gap-2 rounded-lg border border-white/20 bg-white p-1.5 shadow-card sm:flex-row sm:items-center"
            >
              <select
                v-model="searchFilter"
                class="h-10 rounded border border-transparent bg-gray-100 px-3 text-sm text-text-primary outline-none dark:bg-gray-800 dark:text-gray-300"
              >
                <option value="all">All Filters</option>
                <option value="address">Addresses</option>
                <option value="token">Tokens</option>
                <option value="contract">Contracts</option>
              </select>

              <input
                v-model="searchValue"
                class="h-10 flex-1 rounded border border-transparent px-3 text-sm text-text-primary outline-none focus:border-primary-400"
                placeholder="Search by Address / Txn Hash / Block / Token / Contract"
                :disabled="searchLoading"
              />

              <button
                type="submit"
                class="h-10 rounded bg-primary-500 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-600"
                :disabled="searchLoading"
              >
                <span v-if="searchLoading">Searching...</span>
                <span v-else>Search</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>

    <section class="mx-auto -mt-10 max-w-[1400px] px-4 relative z-20">
      <div class="etherscan-card p-4 md:p-5">
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div class="stat-block">
            <div class="stat-label">NEO Price</div>
            <div class="stat-value">${{ formatPrice(neoPrice) }}</div>
            <div :class="priceChangeClass(neoPriceChange)">
              {{ formatPriceChange(neoPriceChange) }}
            </div>
          </div>

          <div class="stat-block">
            <div class="stat-label">Transactions</div>
            <div class="stat-value">{{ formatLargeNumber(txCount) }}</div>
            <div class="text-xs text-text-secondary dark:text-gray-400">{{ tps.toFixed(2) }} TPS</div>
          </div>

          <div class="stat-block">
            <div class="stat-label">Network Fee</div>
            <div class="stat-value">{{ networkFeeDisplay }} Gwei</div>
            <div class="text-xs text-text-secondary dark:text-gray-400">~ ${{ gasCostUsd }}</div>
          </div>

          <div class="chart-block md:col-span-2 xl:col-span-1">
            <div class="stat-label mb-2">Transaction History in 14 days</div>
            <div class="h-[92px]">
              <NetworkChart type="transactions" :data="chartData" />
            </div>
          </div>
        </div>

        <div class="mt-4 border-t border-card-border pt-4 dark:border-card-border-dark">
          <div class="grid gap-4 md:grid-cols-2">
            <div class="mini-stat">
              <span class="mini-label">Last Finalized Block</span>
              <router-link to="/blocks/1" class="mini-value">{{ formatNumber(blockCount) }}</router-link>
            </div>
            <div class="mini-stat">
              <span class="mini-label">Last Safe Block</span>
              <router-link to="/blocks/1" class="mini-value">{{
                formatNumber(Math.max(0, blockCount - 1))
              }}</router-link>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[1400px] px-4 py-5 md:py-6">
      <div class="grid gap-4 lg:grid-cols-2">
        <article class="etherscan-card overflow-hidden">
          <header
            class="flex items-center justify-between border-b border-card-border px-4 py-3 dark:border-card-border-dark"
          >
            <h2 class="text-base font-semibold text-text-primary dark:text-gray-100">Latest Blocks</h2>
            <router-link to="/blocks/1" class="btn-outline text-xs"> View all </router-link>
          </header>

          <div v-if="loading" class="space-y-2 p-4">
            <Skeleton v-for="index in 6" :key="index" height="54px" />
          </div>

          <div v-else-if="blocksError" class="p-4">
            <ErrorState
              title="Unable to load latest blocks"
              message="Please try again in a moment."
              @retry="loadLatestData"
            />
          </div>

          <div v-else-if="!latestBlocks.length" class="p-4">
            <EmptyState title="No blocks found" />
          </div>

          <div v-else>
            <BlockListItem v-for="block in latestBlocks" :key="block.hash" :block="block" />
          </div>
        </article>

        <article class="etherscan-card overflow-hidden">
          <header
            class="flex items-center justify-between border-b border-card-border px-4 py-3 dark:border-card-border-dark"
          >
            <h2 class="text-base font-semibold text-text-primary dark:text-gray-100">Latest Transactions</h2>
            <router-link to="/Transactions/1" class="btn-outline text-xs"> View all </router-link>
          </header>

          <div v-if="loading" class="space-y-2 p-4">
            <Skeleton v-for="index in 6" :key="index" height="54px" />
          </div>

          <div v-else-if="txsError" class="p-4">
            <ErrorState
              title="Unable to load latest transactions"
              message="Please try again in a moment."
              @retry="loadLatestData"
            />
          </div>

          <div v-else-if="!latestTxs.length" class="p-4">
            <EmptyState title="No transactions found" />
          </div>

          <div v-else>
            <TxListItem v-for="tx in latestTxs" :key="tx.hash" :tx="tx" />
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script>
import BlockListItem from "@/components/common/BlockListItem.vue";
import TxListItem from "@/components/common/TxListItem.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import NetworkChart from "@/components/charts/NetworkChart.vue";
import { statsService, blockService, transactionService, searchService } from "@/services";
import { usePriceCache } from "@/composables/usePriceCache";
import { resolveSearchLocation } from "@/utils/searchRouting";

export default {
  name: "HomePageNew",
  components: {
    BlockListItem,
    TxListItem,
    Skeleton,
    EmptyState,
    ErrorState,
    NetworkChart,
  },

  setup() {
    const { fetchPrices } = usePriceCache();
    return { fetchPrices };
  },

  data() {
    return {
      loading: true,
      searchLoading: false,
      blocksError: false,
      txsError: false,
      blockCount: 0,
      txCount: 0,
      latestBlocks: [],
      latestTxs: [],
      neoPrice: 0,
      gasPrice: 0,
      neoPriceChange: 0,
      gasPriceChange: 0,
      marketCap: 0,
      tps: 0,
      chartData: [],
      refreshInterval: null,
      searchValue: "",
      searchFilter: "all",
    };
  },

  computed: {
    networkFeeDisplay() {
      return Math.max(0, Number(this.gasPrice || 0) * 0.08).toFixed(3);
    },
    gasCostUsd() {
      return (Number(this.gasPrice || 0) * 0.02).toFixed(2);
    },
  },

  created() {
    this.loadData();
    this.loadPrices();
    this.refreshInterval = setInterval(() => {
      this.loadLatestData();
    }, 15000);
  },

  beforeUnmount() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  },

  methods: {
    async loadData() {
      this.loading = true;
      try {
        await Promise.all([this.loadStats(), this.loadLatestData(), this.loadChartData()]);
      } catch {
        // Service layer handles error logging
      } finally {
        this.loading = false;
      }
    },

    async loadStats() {
      try {
        const stats = await statsService.getDashboardStats();
        this.blockCount = stats.blocks || 0;
        this.txCount = stats.txs || 0;
      } catch {
        // Service layer handles error logging
      }
    },

    async loadLatestData() {
      try {
        this.blocksError = false;
        this.txsError = false;

        const [blocksRes, txsRes] = await Promise.all([
          blockService.getList(6, 0).catch(() => {
            this.blocksError = true;
            return null;
          }),
          transactionService.getList(6, 0).catch(() => {
            this.txsError = true;
            return null;
          }),
        ]);

        if (blocksRes) this.latestBlocks = blocksRes?.result || [];
        if (txsRes) this.latestTxs = txsRes?.result || [];

        if (this.latestBlocks.length >= 2) {
          const newest = this.latestBlocks[0];
          const oldest = this.latestBlocks[this.latestBlocks.length - 1];
          let timeDiff = (newest.timestamp || 0) - (oldest.timestamp || 0);
          // neo3fura returns ms timestamps; convert to seconds for TPS
          if (timeDiff > 1e10) timeDiff = timeDiff / 1000;
          const totalTxs = this.latestBlocks.reduce((sum, b) => sum + (b.txcount || 0), 0);
          this.tps = timeDiff > 0 ? totalTxs / timeDiff : 0;
        }
      } catch {
        // Service layer handles error logging
      }
    },

    async loadPrices() {
      const data = await this.fetchPrices();
      this.neoPrice = data.neo;
      this.gasPrice = data.gas;
      this.neoPriceChange = data.neoChange;
      this.gasPriceChange = data.gasChange;
      this.marketCap = data.marketCap;
    },

    async loadChartData() {
      try {
        const data = await statsService.getNetworkActivity(14);
        this.chartData = data || [];
      } catch {
        this.chartData = this.generateMockChartData();
      }
    },

    generateMockChartData() {
      const data = [];
      const now = Date.now();
      for (let i = 13; i >= 0; i--) {
        data.push({
          date: new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          transactions: Math.floor(Math.random() * 5000) + 1000,
          addresses: Math.floor(Math.random() * 500) + 100,
          gas: Math.floor(Math.random() * 10000) + 2000,
        });
      }
      return data;
    },

    async handleSearch(inputValue) {
      const query = (inputValue || "").trim();
      if (!query) return;

      this.searchLoading = true;
      try {
        const result = await searchService.search(query);
        const location = resolveSearchLocation(query, result);
        if (location) {
          this.$router.push(location);
        }
      } catch {
        const location = resolveSearchLocation(query, null);
        if (location) {
          this.$router.push(location);
        }
      } finally {
        this.searchLoading = false;
      }
    },

    formatNumber(num) {
      if (!num) return "0";
      return num.toLocaleString();
    },

    formatPrice(price) {
      if (!price) return "0.00";
      return Number(price).toFixed(2);
    },

    formatPriceChange(change) {
      if (!change) return "0.00%";
      const value = Number(change || 0);
      const sign = value >= 0 ? "+" : "";
      return `${sign}${value.toFixed(2)}%`;
    },

    priceChangeClass(change) {
      return Number(change || 0) >= 0 ? "text-green-600" : "text-red-600";
    },

    formatLargeNumber(num) {
      if (!num) return "0";
      if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
      if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
      if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
      return Number(num).toFixed(2);
    },
  },
};
</script>

<style scoped>
.hero-section {
  background-image: radial-gradient(circle at 15% 20%, rgba(56, 189, 248, 0.12), transparent 36%),
    radial-gradient(circle at 80% 10%, rgba(56, 189, 248, 0.15), transparent 30%),
    linear-gradient(180deg, #21325b 0%, #2a3f6e 100%);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 26px 26px;
  opacity: 0.35;
}

.stat-block {
  @apply rounded-md border border-card-border p-3 dark:border-card-border-dark;
}

.chart-block {
  @apply rounded-md border border-card-border p-3 dark:border-card-border-dark;
}

.stat-label {
  @apply text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-gray-400;
}

.stat-value {
  @apply mt-1 text-xl font-semibold text-text-primary dark:text-gray-100;
}

.mini-stat {
  @apply flex items-center justify-between;
}

.mini-label {
  @apply text-sm text-text-secondary dark:text-gray-400;
}

.mini-value {
  @apply text-base font-semibold text-text-primary hover:text-primary-500 dark:text-gray-200 dark:hover:text-primary-400;
}
</style>
