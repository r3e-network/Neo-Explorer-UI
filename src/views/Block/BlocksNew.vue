<template>
  <div class="blocks-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <!-- Breadcrumb -->
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Blocks' }]" />

      <header class="mb-5 flex flex-col gap-1">
        <h1 class="page-title">Blocks</h1>
        <p class="page-subtitle">Blocks confirmed on the Neo N3 blockchain (dBFT 2.0 consensus)</p>
      </header>

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
        <div
          class="flex items-center justify-between border-b border-card-border px-4 py-3 dark:border-card-border-dark"
        >
          <p class="text-sm text-text-secondary dark:text-gray-300">
            Block #{{ formatNumber(rangeStart) }} to #{{ formatNumber(rangeEnd) }}
            <span class="hidden sm:inline">(Total of {{ formatNumber(total) }} blocks)</span>
          </p>
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
        <ErrorState v-else-if="error" title="Failed to load blocks" :message="error" @retry="loadPage" />

        <!-- Empty State -->
        <EmptyState v-else-if="blocks.length === 0" message="No blocks found" icon="block" />

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[800px]">
            <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">Block</th>
                <th
                  class="cursor-pointer select-none px-4 py-3 text-left font-medium text-text-secondary hover:text-primary-500"
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
                <th class="px-4 py-3 text-left font-medium text-text-secondary">Txn</th>
                <th class="px-4 py-3 text-left font-medium text-text-secondary">Validator</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary">GAS Reward</th>
                <th class="px-4 py-3 text-right font-medium text-text-secondary">Size</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
              <tr
                v-for="block in blocks"
                :key="block.hash"
                class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <!-- Block Height -->
                <td class="px-4 py-3">
                  <router-link :to="`/block-info/${block.hash}`" class="etherscan-link font-medium">
                    {{ formatNumber(block.index) }}
                  </router-link>
                </td>
                <!-- Age / DateTime -->
                <td class="px-4 py-3 text-sm text-text-secondary dark:text-gray-400">
                  {{ showAbsoluteTime ? formatUnixTime(block.timestamp) : formatAge(block.timestamp) }}
                </td>
                <!-- Txn Count -->
                <td class="px-4 py-3">
                  <router-link
                    v-if="block.txcount > 0"
                    :to="`/block-info/${block.hash}`"
                    class="etherscan-link text-sm"
                  >
                    {{ block.txcount }}
                  </router-link>
                  <span v-else class="text-sm text-text-secondary">0</span>
                </td>
                <!-- Validator -->
                <td class="px-4 py-3">
                  <HashLink v-if="block.nextconsensus" :hash="block.nextconsensus" type="address" />
                  <span v-else class="text-sm text-text-secondary">--</span>
                </td>
                <!-- GAS Reward -->
                <td class="px-4 py-3 text-right font-mono text-sm text-text-primary dark:text-gray-300">
                  {{ formatGas(block.gasconsumed || block.reward || 0) }}
                </td>
                <!-- Size -->
                <td class="px-4 py-3 text-right text-sm text-text-primary dark:text-gray-300">
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

<script setup>
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { blockService, statsService } from "@/services";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import { formatAge, formatBytes, formatUnixTime, formatNumber, formatGas } from "@/utils/explorerFormat";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import HashLink from "@/components/common/HashLink.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";

const route = useRoute();
const router = useRouter();

// --- State ---
const blocks = ref([]);
const loading = ref(false);
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
  if (blocks.value.length === 0) return 0;
  return Math.min(...blocks.value.map((b) => b.index));
});
const rangeEnd = computed(() => {
  if (blocks.value.length === 0) return 0;
  return Math.max(...blocks.value.map((b) => b.index));
});

// --- Request deduplication ---
let currentRequestId = 0;

// --- Methods ---
async function loadStats() {
  statsLoading.value = true;
  try {
    const stats = await statsService.getDashboardStats();
    totalBlocks.value = stats?.blocks || 0;
    latestHeight.value = totalBlocks.value > 0 ? totalBlocks.value - 1 : 0;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.warn("Failed to load block stats:", err);
  } finally {
    statsLoading.value = false;
  }
}

async function loadPage() {
  const myRequestId = ++currentRequestId;
  loading.value = true;
  error.value = null;
  try {
    const res = await blockService.getList(pageSize.value, paginationOffset.value);
    if (myRequestId !== currentRequestId) return;
    total.value = res?.totalCount || 0;
    blocks.value = res?.result || [];
  } catch (err) {
    if (myRequestId !== currentRequestId) return;
    if (process.env.NODE_ENV !== "production") console.error("Failed to load blocks:", err);
    error.value = "Failed to load blocks. Please try again.";
  } finally {
    if (myRequestId === currentRequestId) {
      loading.value = false;
    }
  }
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    router.push(`/blocks/${page}`);
  }
}

function changePageSize(size) {
  pageSize.value = size;
  router.push("/blocks/1");
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

// Load stats once on mount
loadStats();
</script>
