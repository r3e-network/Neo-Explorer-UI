<template>
  <div class="accounts-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <header class="mb-5 flex flex-col gap-1">
        <h1 class="page-title">Top Accounts</h1>
        <p class="page-subtitle">Addresses ranked by NEO/GAS balance</p>
      </header>

      <div class="etherscan-card overflow-hidden">
        <div
          class="flex items-center justify-between border-b border-card-border px-4 py-3 dark:border-card-border-dark"
        >
          <p class="text-sm text-text-secondary dark:text-gray-300">Rich list ranking</p>
          <p class="text-sm text-text-muted dark:text-gray-400">Page {{ currentPage }} / {{ totalPages }}</p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[880px]">
            <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">Rank</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">Address</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary">NEO Balance</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary">GAS Balance</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary">Txn Count</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
              <tr
                v-for="(account, index) in accounts"
                :key="account.address"
                class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <td class="px-4 py-3 text-sm text-text-muted">
                  {{ (currentPage - 1) * pageSize + index + 1 }}
                </td>
                <td class="px-4 py-3">
                  <router-link
                    :to="`/accountprofile/${account.address}`"
                    :title="account.address"
                    class="font-hash text-sm etherscan-link"
                  >
                    {{ convertAddress(account.address) }}
                  </router-link>
                </td>
                <td class="px-4 py-3 text-right text-sm font-medium text-text-primary dark:text-gray-300">
                  {{ formatBalance(account.neobalance) }}
                </td>
                <td class="px-4 py-3 text-right text-sm font-medium text-text-primary dark:text-gray-300">
                  {{ formatGasBalance(account.gasbalance) }}
                </td>
                <td class="px-4 py-3 text-right text-sm text-text-secondary dark:text-gray-400">
                  {{ formatNumber((account.nep17TransferCount || 0) + (account.nep11TransferCount || 0)) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="loading" class="space-y-2 p-4">
          <Skeleton v-for="index in 10" :key="index" height="44px" />
        </div>

        <div v-else-if="error" class="p-4">
          <ErrorState title="Failed to load accounts" :message="error" @retry="loadAccounts" />
        </div>

        <div v-else-if="accounts.length === 0" class="p-4">
          <EmptyState title="No accounts found" />
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
import { accountService } from "@/services";
import { scriptHashToAddress } from "@/store/util";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";

export default {
  name: "AccountsNew",
  components: {
    EmptyState,
    ErrorState,
    Skeleton,
    EtherscanPagination,
  },
  data() {
    return {
      loading: true,
      error: null,
      accounts: [],
      total: 0,
      currentPage: 1,
      totalPages: 1,
      pageSize: 25,
    };
  },
  watch: {
    "$route.params.page": {
      immediate: true,
      handler(page) {
        this.currentPage = parseInt(page) || 1;
        this.loadAccounts();
      },
    },
  },
  methods: {
    async loadAccounts() {
      this.loading = true;
      this.error = null;
      try {
        const offset = (this.currentPage - 1) * this.pageSize;
        const response = await accountService.getList(this.pageSize, offset);
        this.accounts = response?.result || [];
        this.total = response?.totalCount || 0;
        this.totalPages = Math.ceil(this.total / this.pageSize) || 1;
      } catch {
        this.error = "Failed to load accounts. Please try again.";
        this.accounts = [];
      } finally {
        this.loading = false;
      }
    },
    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.$router.push(`/account/${page}`);
      }
    },
    changePageSize(size) {
      this.pageSize = size;
      this.$router.push("/account/1");
    },
    formatBalance(balance) {
      if (!balance) return "0";
      const num = parseFloat(balance);
      return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
    },
    formatGasBalance(balance) {
      if (!balance) return "0";
      // gasbalance from neo3fura is in smallest unit (10^-8)
      const num = parseFloat(balance) / 1e8;
      return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
    },
    formatNumber(num) {
      if (!num) return "0";
      return num.toLocaleString();
    },
    convertAddress(hash) {
      if (!hash) return "-";
      try {
        return scriptHashToAddress(hash);
      } catch {
        return hash;
      }
    },
  },
};
</script>
