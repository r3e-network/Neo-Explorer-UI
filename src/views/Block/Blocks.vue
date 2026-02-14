<template>
  <div class="blocks-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <!-- Breadcrumb -->
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Blocks' }]" />

      <div class="mb-6 flex items-center gap-3">
        <div class="page-header-icon bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>
        <div>
          <h1 class="page-title">Blocks</h1>
          <p class="page-subtitle">Blocks confirmed on the Neo N3 blockchain (dBFT 2.0 consensus)</p>
        </div>
      </div>

      <!-- Stats Bar -->
      <div class="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div class="etherscan-card flex items-center gap-3 p-4">
          <div
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30"
          >
            <svg class="h-5 w-5 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-xs text-text-secondary">Total Blocks</p>
            <p class="truncate text-sm font-semibold text-text-primary dark:text-gray-100">
              {{ statsLoading ? "..." : formatNumber(totalBlocks) }}
            </p>
          </div>
        </div>
        <div class="etherscan-card flex items-center gap-3 p-4">
          <div
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30"
          >
            <svg class="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-xs text-text-secondary">Latest Block</p>
            <p class="truncate text-sm font-semibold text-text-primary dark:text-gray-100">
              {{ statsLoading ? "..." : "#" + formatNumber(latestHeight) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Block List Card -->
      <div class="etherscan-card overflow-hidden">
        <div class="card-header">
          <p class="text-sm text-text-secondary dark:text-gray-300">
            Block #{{ formatNumber(rangeStart) }} to #{{ formatNumber(rangeEnd) }}
            <span class="hidden sm:inline">(Total of {{ formatNumber(total) }} blocks)</span>
          </p>
          <button
            v-if="blocks.length > 0"
            @click="exportData"
            class="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            title="Export to CSV"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export CSV
          </button>
        </div>

        <!-- Loading Skeleton -->
        <div v-if="loading" class="divide-y divide-card-border dark:divide-card-border-dark">
          <div v-for="i in pageSize" :key="i" class="flex items-center gap-4 px-4 py-3">
            <Skeleton width="60px" height="18px" />
            <Skeleton width="40%" height="18px" />
            <Skeleton width="30px" height="18px" />
            <Skeleton width="80px" height="18px" />
            <Skeleton width="60px" height="18px" />
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-6">
          <ErrorState title="Failed to load blocks" :message="error" @retry="loadPage" />
        </div>

        <!-- Empty State -->
        <EmptyState v-else-if="blocks.length === 0" message="No blocks found" icon="block" />

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[800px]">
            <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
              <tr>
                <th class="table-header-cell">Block</th>
                <th
                  class="table-header-cell cursor-pointer select-none hover:text-primary-500"
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
                <th class="table-header-cell">Txn</th>
                <th class="table-header-cell">Validator</th>
                <th class="table-header-cell-right">GAS Reward</th>
                <th class="table-header-cell-right">Size</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
              <tr
                v-for="block in blocks"
                :key="block.hash"
                class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <!-- Block Height -->
                <td class="table-cell">
                  <router-link :to="`/block-info/${block.hash}`" class="etherscan-link font-medium">
                    {{ formatNumber(block.index) }}
                  </router-link>
                </td>
                <!-- Age / DateTime -->
                <td class="table-cell-secondary">
                  {{ showAbsoluteTime ? formatUnixTime(block.timestamp) : formatAge(block.timestamp) }}
                </td>
                <!-- Txn Count -->
                <td class="table-cell">
                  <router-link
                    v-if="block.txcount > 0"
                    :to="`/block-info/${block.hash}`"
                    class="etherscan-link text-sm"
                  >
                    {{ block.txcount }}
                  </router-link>
                  <span v-else class="table-cell-secondary p-0">0</span>
                </td>
                <!-- Validator -->
                <td class="table-cell">
                  <HashLink v-if="block.nextconsensus" :hash="block.nextconsensus" type="address" />
                  <span v-else class="text-sm text-text-secondary">--</span>
                </td>
                <!-- GAS Reward -->
                <td class="table-cell text-right font-mono">
                  {{ formatGas(block.gasconsumed || block.reward || 0) }}
                </td>
                <!-- Size -->
                <td class="table-cell text-right">
                  {{ formatBytes(block.size) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div
          v-if="!loading && blocks.length > 0"
          class="border-t border-card-border px-4 py-3 dark:border-card-border-dark"
        >
          <InfiniteScroll :loading="loadingMore" :has-more="currentPage < totalPages" @load-more="loadMore" />
          <EtherscanPagination
            v-if="false"
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

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { blockService, statsService } from "@/services";
import { getCache, getCacheKey } from "@/services/cache";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import { getNetworkRefreshIntervalMs } from "@/utils/env";
import { formatAge, formatBytes, formatUnixTime, formatNumber, formatGas } from "@/utils/explorerFormat";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import HashLink from "@/components/common/HashLink.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import InfiniteScroll from "@/components/common/InfiniteScroll.vue";
import { exportBlocksToCSV } from "@/utils/dataExport";

const route = useRoute();
const router = useRouter();

// --- State ---
const blocks = ref([]);
const loading = ref(false);
const loadingMore = ref(false);
const error = ref(null);
const showAbsoluteTime = ref(false);

// Pagination
const currentPage = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const paginationOffset = computed(() => (currentPage.value - 1) * pageSize.value);

// Stats bar
const statsLoading = ref(true);
const totalBlocks = ref(0);
const latestHeight = ref(0);

// Range display
const rangeStart = computed(() => {
  const indices = blocks.value?.map((b) => b.index) ?? [];
  return indices.length ? Math.min(...indices) : 0;
});
const rangeEnd = computed(() => {
  const indices = blocks.value?.map((b) => b.index) ?? [];
  return indices.length ? Math.max(...indices) : 0;
});

// --- Request deduplication ---
let currentRequestId = 0;
let refreshTimer = null;

// --- Methods ---
async function loadStats(forceRefresh = false) {
  statsLoading.value = true;
  try {
    const stats = await statsService.getDashboardStats(forceRefresh);
    totalBlocks.value = stats?.blocks || 0;
    latestHeight.value = totalBlocks.value > 0 ? totalBlocks.value - 1 : 0;
  } catch (err) {
    if (import.meta.env.DEV) console.warn("Failed to load block stats:", err);
  } finally {
    statsLoading.value = false;
  }
}

async function loadPage({ silent = false, forceRefresh = false } = {}) {
  const myRequestId = ++currentRequestId;
  const skip = paginationOffset.value;
  const cacheKey = getCacheKey("block_list", { limit: pageSize.value, skip });
  const hasCachedData = getCache(cacheKey) !== null;
  const shouldShowLoading = !silent && !hasCachedData;

  if (shouldShowLoading) {
    loading.value = true;
  }

  if (!silent) {
    error.value = null;
  }

  try {
    const res = await blockService.getList(pageSize.value, skip, {
      forceRefresh,
    });
    if (myRequestId !== currentRequestId) return;
    total.value = res?.totalCount || 0;
    blocks.value = res?.result || [];
  } catch (err) {
    if (myRequestId !== currentRequestId) return;
    if (import.meta.env.DEV) console.error("Failed to load blocks:", err);

    if (!silent || !blocks.value?.length) {
      error.value = "Failed to load blocks. Please try again.";
    }
  } finally {
    if (myRequestId === currentRequestId && shouldShowLoading) {
      loading.value = false;
    }
  }
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    router.push("/blocks/" + page).catch(() => {});
  }
}

function changePageSize(size) {
  pageSize.value = size;
  router.push("/blocks/1").catch(() => {});
}

async function loadMore() {
  if (loadingMore.value || currentPage.value >= totalPages.value) return;

  loadingMore.value = true;
  const nextPage = currentPage.value + 1;
  const skip = (nextPage - 1) * pageSize.value;

  try {
    const res = await blockService.getList(pageSize.value, skip, {
      forceRefresh: true,
    });
    if (res?.result?.length > 0) {
      blocks.value = [...blocks.value, ...res.result];
      currentPage.value = nextPage;
      total.value = res.totalCount || total.value;
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error("Failed to load more blocks:", err);
    }
  } finally {
    loadingMore.value = false;
  }
}

function startAutoRefresh() {
  stopAutoRefresh();

  refreshTimer = setInterval(() => {
    loadPage({ silent: true, forceRefresh: true });
    loadStats(true);
  }, getNetworkRefreshIntervalMs());
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function exportData() {
  if (!blocks.value || blocks.value.length === 0) {
    return;
  }
  exportBlocksToCSV(blocks.value);
}

// --- Route watcher ---
watch(
  () => route.params.page,
  (page) => {
    const parsed = parseInt(page) || 1;
    currentPage.value = Math.max(1, parsed);
    loadPage();
  },
  { immediate: true }
);

onMounted(() => {
  loadStats();
  startAutoRefresh();
});

onBeforeUnmount(() => {
  stopAutoRefresh();
});
</script>
