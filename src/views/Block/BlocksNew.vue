<template>
  <div class="blocks-page min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Blocks</h1>
        <p class="text-gray-500 dark:text-gray-400">
          Total {{ formatNumber(total) }} blocks
        </p>
      </div>

      <!-- Blocks Table -->
      <div
        class="card bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
      >
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  class="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300"
                >
                  Height
                </th>
                <th
                  class="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300"
                >
                  Hash
                </th>
                <th
                  class="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300"
                >
                  Txns
                </th>
                <th
                  class="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300"
                >
                  Size
                </th>
                <th
                  class="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300"
                >
                  Time
                </th>
              </tr>
            </thead>
            <tbody class="divide-y dark:divide-gray-700">
              <tr
                v-for="block in blocks"
                :key="block.hash"
                class="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td class="px-4 py-3">
                  <router-link
                    :to="`/blockinfo/${block.hash}`"
                    class="text-primary-500 hover:text-primary-600 font-medium"
                  >
                    {{ block.index }}
                  </router-link>
                </td>
                <td class="px-4 py-3">
                  <router-link
                    :to="`/blockinfo/${block.hash}`"
                    class="text-primary-500 hover:text-primary-600 font-mono text-sm"
                  >
                    {{ truncateHash(block.hash) }}
                  </router-link>
                </td>
                <td class="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {{ block.txcount || 0 }}
                </td>
                <td class="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {{ formatSize(block.size) }}
                </td>
                <td class="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">
                  {{ formatTime(block.timestamp) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="p-8 text-center">
          <div
            class="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"
          ></div>
        </div>

        <!-- Pagination -->
        <div
          class="px-4 py-3 border-t dark:border-gray-700 flex justify-between items-center"
        >
          <span class="text-sm text-gray-500"
            >Page {{ page }} of {{ totalPages }}</span
          >
          <div class="flex gap-2">
            <button
              @click="prevPage"
              :disabled="page <= 1"
              class="btn-secondary"
            >
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
  </div>
</template>

<script>
import { blockService } from "@/services";

export default {
  name: "BlocksPage",
  data() {
    return {
      blocks: [],
      total: 0,
      page: 1,
      pageSize: 20,
      loading: false,
    };
  },
  computed: {
    totalPages() {
      return Math.ceil(this.total / this.pageSize);
    },
  },
  watch: {
    "$route.params.page": {
      immediate: true,
      handler(newPage) {
        this.page = parseInt(newPage) || 1;
        this.loadBlocks();
      },
    },
  },
  methods: {
    async loadBlocks() {
      this.loading = true;
      try {
        const skip = (this.page - 1) * this.pageSize;
        const res = await blockService.getList(this.pageSize, skip);
        this.blocks = res?.result || [];
        this.total = res?.totalCount || 0;
      } catch (error) {
        console.error("Failed to load blocks:", error);
      } finally {
        this.loading = false;
      }
    },
    prevPage() {
      if (this.page > 1) {
        this.$router.push(`/blocks/${this.page - 1}`);
      }
    },
    nextPage() {
      if (this.page < this.totalPages) {
        this.$router.push(`/blocks/${this.page + 1}`);
      }
    },
    truncateHash(hash) {
      if (!hash) return "";
      return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
    },
    formatSize(size) {
      if (!size) return "0 B";
      return `${(size / 1024).toFixed(2)} KB`;
    },
    formatTime(timestamp) {
      if (!timestamp) return "";
      return new Date(timestamp * 1000).toLocaleString();
    },
    formatNumber(num) {
      return num?.toLocaleString() || "0";
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
