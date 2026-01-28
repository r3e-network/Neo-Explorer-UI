<template>
  <div class="transactions-page min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-8">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Transactions
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          Total {{ formatNumber(total) }} transactions
        </p>
      </div>

      <div
        class="card bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
      >
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  class="px-4 py-3 text-left text-sm font-medium text-gray-500"
                >
                  Txn Hash
                </th>
                <th
                  class="px-4 py-3 text-left text-sm font-medium text-gray-500"
                >
                  Block
                </th>
                <th
                  class="px-4 py-3 text-left text-sm font-medium text-gray-500"
                >
                  Time
                </th>
                <th
                  class="px-4 py-3 text-left text-sm font-medium text-gray-500"
                >
                  Sender
                </th>
              </tr>
            </thead>
            <tbody class="divide-y dark:divide-gray-700">
              <tr
                v-for="tx in transactions"
                :key="tx.hash"
                class="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td class="px-4 py-3">
                  <router-link
                    :to="`/transactionInfo/${tx.hash}`"
                    class="text-primary-500 font-mono text-sm"
                  >
                    {{ truncateHash(tx.hash) }}
                  </router-link>
                </td>
                <td class="px-4 py-3">
                  <router-link
                    :to="`/blockinfo/${tx.blockhash}`"
                    class="text-primary-500"
                  >
                    {{ tx.blockindex }}
                  </router-link>
                </td>
                <td class="px-4 py-3 text-gray-500 text-sm">
                  {{ formatTime(tx.blocktime) }}
                </td>
                <td class="px-4 py-3">
                  <router-link
                    :to="`/accountprofile/${tx.sender}`"
                    class="text-primary-500 font-mono text-sm"
                  >
                    {{ truncateHash(tx.sender) }}
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="p-8 text-center">
          <div class="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          <p class="text-gray-500 dark:text-gray-400 mt-3">Loading transactions...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-8 text-center">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p class="text-gray-700 dark:text-gray-300 font-semibold mb-1">Failed to load transactions</p>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{{ error }}</p>
          <button @click="loadData" class="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors">
            Try Again
          </button>
        </div>

        <!-- Empty State -->
        <div v-else-if="transactions.length === 0" class="p-8 text-center">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4z" />
            </svg>
          </div>
          <p class="text-gray-500 dark:text-gray-400 font-medium">No transactions found</p>
        </div>
      </div>
      <!-- Pagination -->
      <div class="mt-4 flex justify-between items-center">
        <span class="text-sm text-gray-500"
          >Page {{ page }} of {{ totalPages }}</span
        >
        <div class="flex gap-2">
          <button @click="prevPage" :disabled="page <= 1" class="btn-secondary">
            Previous
          </button>
          <button
            @click="nextPage"
            :disabled="page >= totalPages"
            class="btn-secondary"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { transactionService } from "@/services";

export default {
  name: "TransactionsPage",
  data: () => ({
    transactions: [],
    total: 0,
    page: 1,
    pageSize: 20,
    loading: false,
    error: null,
  }),
  computed: {
    totalPages() {
      return Math.ceil(this.total / this.pageSize);
    },
  },
  watch: {
    "$route.params.page": {
      immediate: true,
      handler(p) {
        this.page = parseInt(p) || 1;
        this.loadData();
      },
    },
  },
  methods: {
    async loadData() {
      this.loading = true;
      this.error = null;
      try {
        const skip = (this.page - 1) * this.pageSize;
        const res = await transactionService.getList(this.pageSize, skip);
        this.transactions = res?.result || [];
        this.total = res?.totalCount || 0;
      } catch (err) {
        console.error("Failed to load transactions:", err);
        this.error = "Failed to load transactions. Please try again.";
      } finally {
        this.loading = false;
      }
    },
    prevPage() {
      if (this.page > 1) this.$router.push(`/Transactions/${this.page - 1}`);
    },
    nextPage() {
      if (this.page < this.totalPages)
        this.$router.push(`/Transactions/${this.page + 1}`);
    },
    truncateHash(h) {
      return h ? `${h.slice(0, 10)}...${h.slice(-6)}` : "";
    },
    formatTime(ts) {
      return ts ? new Date(ts * 1000).toLocaleString() : "";
    },
    formatNumber(n) {
      return n?.toLocaleString() || "0";
    },
  },
};
</script>

<style scoped>
.btn-secondary {
  @apply px-4 py-2 bg-gray-100 text-gray-700 rounded;
}
.btn-secondary:hover {
  @apply bg-gray-200;
}
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
