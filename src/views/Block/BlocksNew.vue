<template>
  <div class="blocks-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <header class="mb-5 flex flex-col gap-1">
        <h1 class="page-title">Blocks</h1>
        <p class="page-subtitle">A list of confirmed blocks on Neo N3</p>
      </header>

      <div class="etherscan-card overflow-hidden">
        <div
          class="flex items-center justify-between border-b border-card-border px-4 py-3 dark:border-card-border-dark"
        >
          <p class="text-sm text-text-secondary dark:text-gray-300">Showing latest blocks</p>
          <p class="text-sm text-text-muted dark:text-gray-400">Total {{ formatNumber(total) }}</p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px]">
            <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">Block</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">Hash</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">Txns</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">Size</th>
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
              </tr>
            </thead>
            <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
              <tr
                v-for="block in blocks"
                :key="block.hash"
                class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <td class="px-4 py-3">
                  <router-link :to="`/blockinfo/${block.hash}`" class="font-medium etherscan-link">
                    {{ block.index }}
                  </router-link>
                </td>
                <td class="px-4 py-3">
                  <router-link
                    :to="`/blockinfo/${block.hash}`"
                    :title="block.hash"
                    class="font-hash text-sm etherscan-link"
                  >
                    {{ truncateHash(block.hash) }}
                  </router-link>
                </td>
                <td class="px-4 py-3 text-sm text-text-primary dark:text-gray-300">
                  {{ block.txcount || 0 }}
                </td>
                <td class="px-4 py-3 text-sm text-text-primary dark:text-gray-300">
                  {{ formatBytes(block.size) }}
                </td>
                <td class="px-4 py-3 text-sm text-text-secondary dark:text-gray-400">
                  {{ showAbsoluteTime ? formatUnixTime(block.timestamp) : formatAge(block.timestamp) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="loading" class="space-y-2 p-4">
          <Skeleton v-for="index in 8" :key="index" height="44px" />
        </div>

        <div v-else-if="error" class="p-4">
          <ErrorState title="Failed to load blocks" :message="error" @retry="loadBlocks" />
        </div>

        <div v-else-if="blocks.length === 0" class="p-4">
          <EmptyState title="No blocks found" />
        </div>

        <div class="border-t border-card-border px-4 py-3 dark:border-card-border-dark">
          <EtherscanPagination
            :page="page"
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
import { blockService } from "@/services";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import { truncateHash, formatAge, formatBytes, formatUnixTime } from "@/utils/explorerFormat";

export default {
  name: "BlocksPage",
  components: {
    EmptyState,
    ErrorState,
    Skeleton,
    EtherscanPagination,
  },
  data() {
    return {
      blocks: [],
      total: 0,
      page: 1,
      pageSize: 20,
      loading: false,
      error: null,
      showAbsoluteTime: false,
    };
  },
  computed: {
    totalPages() {
      return Math.max(1, Math.ceil(this.total / this.pageSize));
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
      this.error = null;
      try {
        const skip = (this.page - 1) * this.pageSize;
        const res = await blockService.getList(this.pageSize, skip);
        this.blocks = res?.result || [];
        this.total = res?.totalCount || 0;
      } catch {
        this.error = "Failed to load blocks. Please try again.";
      } finally {
        this.loading = false;
      }
    },
    goToPage(p) {
      this.$router.push(`/blocks/${p}`);
    },
    changePageSize(size) {
      this.pageSize = size;
      this.$router.push("/blocks/1");
    },
    truncateHash,
    formatAge,
    formatBytes,
    formatUnixTime,
    formatNumber(num) {
      return Number(num || 0).toLocaleString();
    },
  },
};
</script>
