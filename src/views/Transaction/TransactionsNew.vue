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
      try {
        const skip = (this.page - 1) * this.pageSize;
        const res = await transactionService.getList(this.pageSize, skip);
        this.transactions = res?.result || [];
        this.total = res?.totalCount || 0;
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
