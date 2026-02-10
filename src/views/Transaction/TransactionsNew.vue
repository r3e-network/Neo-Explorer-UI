<template>
  <div class="transactions-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <header class="mb-5 flex flex-col gap-1">
        <h1 class="page-title">Transactions</h1>
        <p class="page-subtitle">A list of latest transactions on Neo N3</p>
      </header>

      <div class="etherscan-card overflow-hidden">
        <div
          class="flex items-center justify-between border-b border-card-border px-4 py-3 dark:border-card-border-dark"
        >
          <p class="text-sm text-text-secondary dark:text-gray-300">Latest confirmed transactions</p>
          <p class="text-sm text-text-muted dark:text-gray-400">Total {{ formatNumber(total) }}</p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[820px]">
            <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">Txn Hash</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">Block</th>
                <th
                  class="px-4 py-3 text-left font-medium text-text-secondary cursor-pointer select-none hover:text-primary-500"
                  @click="showAbsoluteTime = !showAbsoluteTime"
                >
                  {{ showAbsoluteTime ? "Date Time (UTC)" : "Age" }}
                  <svg class="ml-0.5 inline h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                </th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">From</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
              <tr
                v-for="tx in transactions"
                :key="tx.hash"
                class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <td class="px-4 py-3">
                  <router-link
                    :to="`/transaction-info/${tx.hash}`"
                    :title="tx.hash"
                    class="font-hash text-sm etherscan-link"
                  >
                    {{ truncateHash(tx.hash) }}
                  </router-link>
                </td>
                <td class="px-4 py-3">
                  <router-link :to="`/block-info/${tx.blockhash}`" class="etherscan-link">
                    {{ tx.blockIndex }}
                  </router-link>
                </td>
                <td class="px-4 py-3 text-sm text-text-secondary dark:text-gray-400">
                  {{ showAbsoluteTime ? formatUnixTime(tx.blocktime) : formatAge(tx.blocktime) }}
                </td>
                <td class="px-4 py-3">
                  <router-link :to="`/account-profile/${tx.sender}`" class="font-hash text-sm etherscan-link">
                    {{ truncateHash(tx.sender, 10, 6) }}
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="loading" class="space-y-2 p-4">
          <Skeleton v-for="index in 8" :key="index" height="44px" />
        </div>

        <div v-else-if="error" class="p-4">
          <ErrorState title="Failed to load transactions" :message="error" @retry="loadData" />
        </div>

        <div v-else-if="transactions.length === 0" class="p-4">
          <EmptyState title="No transactions found" />
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
import { transactionService } from "@/services";
import { createPaginationMixin } from "@/composables/usePagination";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import { truncateHash, formatAge, formatUnixTime, formatNumber } from "@/utils/explorerFormat";

export default {
  name: "TransactionsPage",
  mixins: [createPaginationMixin("/transactions")],
  components: {
    EmptyState,
    ErrorState,
    Skeleton,
    EtherscanPagination,
  },
  data: () => ({
    transactions: [],
    loading: false,
    error: null,
    showAbsoluteTime: false,
  }),
  methods: {
    async loadPage() {
      this.loading = true;
      this.error = null;
      try {
        const res = await transactionService.getList(this.pageSize, this.paginationOffset);
        this.transactions = this.applyPage(res?.totalCount, res?.result || []);
      } catch {
        this.error = "Failed to load transactions. Please try again.";
      } finally {
        this.loading = false;
      }
    },
    truncateHash,
    formatAge,
    formatUnixTime,
    formatNumber,
  },
};
</script>
