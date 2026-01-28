<template>
  <div class="contracts-page min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Page Header -->
    <div
      class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="container mx-auto px-4 py-6">
        <h1 class="text-2xl font-bold text-gray-800 dark:text-white">
          {{ $t("contracts.title") || "Verified Contracts" }}
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          {{ $t("contracts.subtitle") || "Smart Contracts deployed on Neo N3" }}
        </p>
      </div>
    </div>

    <!-- Contract List -->
    <div class="container mx-auto px-4 py-6">
      <div
        class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
      >
        <div class="p-4">
          <!-- Loading State -->
          <div v-if="loading" class="space-y-4">
            <div v-for="i in 10" :key="i" class="animate-pulse">
              <div class="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else-if="contracts.length === 0" class="text-center py-12">
            <p class="text-gray-500 dark:text-gray-400">No contracts found</p>
          </div>

          <!-- Contract Table -->
          <div v-else class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-left text-gray-500 dark:text-gray-400 text-sm">
                  <th class="pb-4 font-medium">#</th>
                  <th class="pb-4 font-medium">Contract</th>
                  <th class="pb-4 font-medium">Hash</th>
                  <th class="pb-4 font-medium text-right">Invocations</th>
                  <th class="pb-4 font-medium text-right">Created</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr
                  v-for="(contract, index) in contracts"
                  :key="contract.hash"
                  class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td class="py-4 text-gray-500">
                    {{ (currentPage - 1) * pageSize + index + 1 }}
                  </td>
                  <td class="py-4">
                    <router-link
                      :to="`/contractinfo/${contract.hash}`"
                      class="font-medium text-gray-800 dark:text-white hover:text-primary-500"
                    >
                      {{ contract.name || "Unknown Contract" }}
                    </router-link>
                  </td>
                  <td class="py-4">
                    <router-link
                      :to="`/contractinfo/${contract.hash}`"
                      class="text-primary-500 hover:text-primary-600 font-mono text-sm"
                    >
                      {{ shortenHash(contract.hash) }}
                    </router-link>
                  </td>
                  <td class="py-4 text-right text-gray-600 dark:text-gray-300">
                    {{ formatNumber(contract.invocations || 0) }}
                  </td>
                  <td
                    class="py-4 text-right text-gray-500 dark:text-gray-400 text-sm"
                  >
                    {{ formatTime(contract.createtime) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="mt-6 flex justify-center">
            <nav class="flex items-center gap-2">
              <button
                @click="goToPage(currentPage - 1)"
                :disabled="currentPage === 1"
                class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <span class="px-4 py-2 text-gray-600 dark:text-gray-300">
                Page {{ currentPage }} of {{ totalPages }}
              </span>
              <button
                @click="goToPage(currentPage + 1)"
                :disabled="currentPage === totalPages"
                class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { contractService } from "@/services";

export default {
  name: "ContractsNew",
  data() {
    return {
      loading: true,
      contracts: [],
      currentPage: 1,
      totalPages: 1,
      pageSize: 25,
    };
  },
  watch: {
    "$route.params.page"(page) {
      if (page) {
        this.currentPage = parseInt(page) || 1;
        this.loadContracts();
      }
    },
  },
  created() {
    const { page } = this.$route.params;
    if (page) this.currentPage = parseInt(page) || 1;
    this.loadContracts();
  },
  methods: {
    async loadContracts() {
      this.loading = true;
      try {
        const offset = (this.currentPage - 1) * this.pageSize;
        const response = await contractService.getList(this.pageSize, offset);
        this.contracts = response?.result || [];
        this.totalPages =
          Math.ceil((response?.totalCount || 0) / this.pageSize) || 1;
      } catch (error) {
        console.error("Failed to load contracts:", error);
        this.contracts = [];
      } finally {
        this.loading = false;
      }
    },
    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.$router.push(`/contracts/${page}`);
        this.loadContracts();
      }
    },
    shortenHash(hash) {
      if (!hash) return "";
      return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
    },
    formatNumber(num) {
      if (!num) return "0";
      return num.toLocaleString();
    },
    formatTime(timestamp) {
      if (!timestamp) return "-";
      return new Date(timestamp * 1000).toLocaleDateString();
    },
  },
};
</script>
