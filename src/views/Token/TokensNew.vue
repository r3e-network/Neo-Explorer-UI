<template>
  <div class="tokens-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <header class="mb-5 flex flex-col gap-1">
        <h1 class="page-title">Token Tracker</h1>
        <p class="page-subtitle">NEP-17 and NEP-11 tokens on Neo N3</p>
      </header>

      <div class="etherscan-card overflow-hidden">
        <div class="border-b border-card-border px-4 dark:border-card-border-dark">
          <nav class="flex gap-1 py-2">
            <button
              @click="activeTab = 'nep17'"
              :class="['tab-btn', activeTab === 'nep17' ? 'tab-btn-active' : 'tab-btn-inactive']"
            >
              NEP-17 Tokens
            </button>
            <button
              @click="activeTab = 'nep11'"
              :class="['tab-btn', activeTab === 'nep11' ? 'tab-btn-active' : 'tab-btn-inactive']"
            >
              NEP-11 NFTs
            </button>
          </nav>
        </div>

        <div
          class="flex items-center justify-between border-b border-card-border px-4 py-3 dark:border-card-border-dark"
        >
          <p class="text-sm text-text-secondary dark:text-gray-300">
            {{ activeTabLabel }}
          </p>
          <p class="text-sm text-text-muted dark:text-gray-400">Page {{ currentPage }} / {{ totalPages }}</p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[920px]">
            <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">#</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">Token</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">Symbol</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">Contract</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary">Holders</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary">Total Supply</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
              <tr
                v-for="(token, index) in tokens"
                :key="token.hash"
                class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <td class="px-4 py-3 text-sm text-text-muted">
                  {{ (currentPage - 1) * pageSize + index + 1 }}
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-text-primary dark:bg-gray-700 dark:text-gray-100"
                    >
                      {{ token.symbol?.charAt(0) || "?" }}
                    </div>
                    <span class="font-medium text-text-primary dark:text-gray-100">
                      {{ token.tokenname || "Unknown Token" }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 text-sm text-text-primary dark:text-gray-300">
                  {{ token.symbol || "-" }}
                </td>
                <td class="px-4 py-3">
                  <router-link :to="`/contractinfo/${token.hash}`" class="font-hash text-sm etherscan-link">
                    {{ truncateHash(token.hash) }}
                  </router-link>
                </td>
                <td class="px-4 py-3 text-right text-sm text-text-primary dark:text-gray-300">
                  {{ formatNumber(token.holders || 0) }}
                </td>
                <td class="px-4 py-3 text-right text-sm text-text-primary dark:text-gray-300">
                  {{ formatSupply(token) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="loading" class="space-y-2 p-4">
          <Skeleton v-for="index in 10" :key="index" height="44px" />
        </div>

        <div v-else-if="tokens.length === 0" class="p-4">
          <EmptyState title="No tokens found" />
        </div>

        <div class="border-t border-card-border px-4 py-3 dark:border-card-border-dark">
          <EtherscanPagination
            :page="currentPage"
            :total-pages="totalPages"
            :page-size="pageSize"
            :total="total"
            @update:page="goToPage"
            @update:page-size="changePageSize"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { tokenService } from "@/services";
import EmptyState from "@/components/common/EmptyState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import { truncateHash } from "@/utils/explorerFormat";

export default {
  name: "TokensNew",
  components: {
    EmptyState,
    Skeleton,
    EtherscanPagination,
  },
  data() {
    return {
      loading: true,
      tokens: [],
      activeTab: "nep17",
      total: 0,
      currentPage: 1,
      totalPages: 1,
      pageSize: 25,
    };
  },
  computed: {
    activeTabLabel() {
      return this.activeTab === "nep17" ? "NEP-17 Token List" : "NEP-11 NFT List";
    },
  },
  watch: {
    activeTab() {
      const alreadyOnPage1 = this.currentPage === 1;
      this.currentPage = 1;
      this.$router.push(`/tokens/${this.activeTab}/1`);
      if (alreadyOnPage1) {
        // Page watcher won't fire (value unchanged), so load directly
        this.loadTokens();
      }
      // Otherwise the page watcher handles it
    },
    "$route.params.tab": {
      immediate: true,
      handler(tab) {
        if (tab && tab !== this.activeTab) this.activeTab = tab;
      },
    },
    "$route.params.page": {
      immediate: true,
      handler(page) {
        this.currentPage = parseInt(page) || 1;
        this.loadTokens();
      },
    },
  },
  methods: {
    async loadTokens() {
      this.loading = true;
      try {
        const offset = (this.currentPage - 1) * this.pageSize;
        const response =
          this.activeTab === "nep11"
            ? await tokenService.getNep11List(this.pageSize, offset)
            : await tokenService.getNep17List(this.pageSize, offset);

        this.tokens = response?.result || [];
        this.total = response?.totalCount || 0;
        this.totalPages = Math.ceil(this.total / this.pageSize) || 1;
      } catch {
        this.tokens = [];
      } finally {
        this.loading = false;
      }
    },
    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.$router.push(`/tokens/${this.activeTab}/${page}`);
      }
    },
    changePageSize(size) {
      this.pageSize = size;
      this.$router.push(`/tokens/${this.activeTab}/1`);
    },
    truncateHash,
    formatNumber(num) {
      if (!num) return "0";
      return num.toLocaleString();
    },
    formatSupply(token) {
      const supply = token.totalsupply;
      if (!supply) return "0";
      const decimals = token.decimals || 0;
      const num = parseFloat(supply) / Math.pow(10, decimals);
      return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    },
  },
};
</script>

<style scoped>
.tab-btn {
  @apply rounded-md px-3 py-2 text-sm font-medium transition-colors;
}

.tab-btn-active {
  @apply bg-primary-50 text-primary-500 dark:bg-primary-900/30 dark:text-primary-400;
}

.tab-btn-inactive {
  @apply text-text-secondary hover:bg-gray-100 hover:text-text-primary dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200;
}
</style>
