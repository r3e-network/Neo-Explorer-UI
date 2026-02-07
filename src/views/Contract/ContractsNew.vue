<template>
  <div class="contracts-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <header class="mb-5 flex flex-col gap-1">
        <h1 class="page-title">Verified Contracts</h1>
        <p class="page-subtitle">Smart contracts deployed on Neo N3</p>
      </header>

      <div class="etherscan-card overflow-hidden">
        <div
          class="flex items-center justify-between border-b border-card-border px-4 py-3 dark:border-card-border-dark"
        >
          <p class="text-sm text-text-secondary dark:text-gray-300">Contract registry</p>
          <p class="text-sm text-text-muted dark:text-gray-400">Page {{ currentPage }} / {{ totalPages }}</p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[900px]">
            <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">#</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">Contract</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">Hash</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary">Invocations</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary">Created</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
              <tr
                v-for="(contract, index) in contracts"
                :key="contract.hash"
                class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <td class="px-4 py-3 text-sm text-text-muted">
                  {{ (currentPage - 1) * pageSize + index + 1 }}
                </td>
                <td class="px-4 py-3">
                  <router-link
                    :to="`/contractinfo/${contract.hash}`"
                    class="font-medium text-text-primary etherscan-link dark:text-gray-100"
                  >
                    {{ contract.name || "Unknown Contract" }}
                  </router-link>
                </td>
                <td class="px-4 py-3">
                  <router-link :to="`/contractinfo/${contract.hash}`" class="font-hash text-sm etherscan-link">
                    {{ truncateHash(contract.hash) }}
                  </router-link>
                </td>
                <td class="px-4 py-3 text-right text-sm text-text-primary dark:text-gray-300">
                  {{ formatNumber(contract.invocations || 0) }}
                </td>
                <td class="px-4 py-3 text-right text-sm text-text-secondary dark:text-gray-400">
                  {{ formatTime(contract.createtime) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="loading" class="space-y-2 p-4">
          <Skeleton v-for="index in 10" :key="index" height="44px" />
        </div>

        <div v-else-if="error" class="p-4">
          <ErrorState title="Failed to load contracts" :message="error" @retry="loadContracts" />
        </div>

        <div v-else-if="contracts.length === 0" class="p-4">
          <EmptyState title="No contracts found" />
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
import { contractService } from "@/services";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import { truncateHash, formatUnixTime } from "@/utils/explorerFormat";

export default {
  name: "ContractsNew",
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
      contracts: [],
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
        this.loadContracts();
      },
    },
  },
  methods: {
    async loadContracts() {
      this.loading = true;
      this.error = null;
      try {
        const offset = (this.currentPage - 1) * this.pageSize;
        const response = await contractService.getList(this.pageSize, offset);
        this.contracts = response?.result || [];
        this.total = response?.totalCount || 0;
        this.totalPages = Math.ceil(this.total / this.pageSize) || 1;
      } catch {
        this.error = "Failed to load contracts. Please try again.";
        this.contracts = [];
      } finally {
        this.loading = false;
      }
    },
    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.$router.push(`/contracts/${page}`);
      }
    },
    changePageSize(size) {
      this.pageSize = size;
      this.$router.push("/contracts/1");
    },
    truncateHash,
    formatNumber(num) {
      if (!num) return "0";
      return num.toLocaleString();
    },
    formatTime(timestamp) {
      return formatUnixTime(timestamp) || "-";
    },
  },
};
</script>
