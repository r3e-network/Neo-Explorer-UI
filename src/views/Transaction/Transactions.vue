<template>
  <div class="transactions-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <!-- Breadcrumb -->
      <Breadcrumb :items="breadcrumbs" />

      <!-- Page Header -->
      <div class="mb-6 flex items-center gap-3">
        <div class="page-header-icon bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        </div>
        <div>
          <h1 class="page-title">Transactions</h1>
          <p class="page-subtitle">Neo N3 network transactions</p>
        </div>
      </div>

      <!-- Stats Bar -->
      <div
        v-if="total > 0"
        class="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 dark:border-blue-800 dark:bg-blue-900/20"
      >
        <svg class="h-4 w-4 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span class="text-sm text-blue-800 dark:text-blue-300">
          More than {{ formatNumber(total) }} transactions found
        </span>
      </div>

      <!-- Main Card -->
      <div class="etherscan-card overflow-hidden">
        <!-- Card Header -->
        <div class="card-header flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-text-secondary dark:text-gray-400">
            Showing {{ startRecord }} to {{ endRecord }} of {{ formatNumber(total) }} transactions
          </p>
          <button
            v-if="transactions.length > 0"
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

        <!-- Loading Skeletons -->
        <div v-if="loading" class="divide-y divide-card-border dark:divide-card-border-dark">
          <div v-for="i in pageSize" :key="'skel-' + i" class="flex items-center gap-4 px-4 py-3.5">
            <Skeleton width="180px" height="16px" />
            <Skeleton width="60px" height="24px" variant="rounded" />
            <Skeleton width="70px" height="16px" />
            <Skeleton width="80px" height="16px" />
            <Skeleton width="140px" height="16px" class="hidden md:block" />
            <Skeleton width="140px" height="16px" class="hidden lg:block" />
            <Skeleton width="80px" height="16px" class="hidden lg:block" />
            <Skeleton width="70px" height="16px" class="hidden xl:block" />
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-6">
          <ErrorState title="Failed to load transactions" :message="error" @retry="loadPage" />
        </div>

        <!-- Empty State -->
        <EmptyState v-else-if="transactions.length === 0" icon="tx" message="No transactions found" />

        <!-- Transaction Table -->
        <TransactionTable
          v-else
          :transactions="transactions"
          :show-absolute-time="showAbsoluteTime"
          :transfer-summary-by-hash="transferSummaryByHash"
          @toggle-time="showAbsoluteTime = !showAbsoluteTime"
        />

        <!-- Pagination -->
        <div
          v-if="!loading && transactions.length > 0"
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
import { transactionService } from "@/services";
import { getCache, getCacheKey } from "@/services/cache";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import { getNetworkRefreshIntervalMs } from "@/utils/env";
import { formatNumber } from "@/utils/explorerFormat";
import { useTransferSummary } from "@/composables/useTransferSummary";
import { exportTransactionsToCSV } from "@/utils/dataExport";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EtherscanPagination from "@/components/common/EtherscanPagination.vue";
import InfiniteScroll from "@/components/common/InfiniteScroll.vue";
import TransactionTable from "./components/TransactionTable.vue";

const route = useRoute();
const router = useRouter();

// State
const transactions = ref([]);
const loading = ref(false);
const loadingMore = ref(false);
const error = ref(null);
const showAbsoluteTime = ref(false);
const currentPage = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);
let currentRequestId = 0;
let refreshTimer = null;

const { transferSummaryByHash, enrichTransactions } = useTransferSummary();

// Computed
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const startRecord = computed(() => (total.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1));
const endRecord = computed(() => Math.min(currentPage.value * pageSize.value, total.value));

const breadcrumbs = [{ label: "Home", to: "/homepage" }, { label: "Transactions" }];

// Data loading
async function loadPage({ silent = false, forceRefresh = false } = {}) {
  const myRequestId = ++currentRequestId;
  const skip = (currentPage.value - 1) * pageSize.value;
  const cacheKey = getCacheKey("tx_list", { limit: pageSize.value, skip });
  const hasCachedData = getCache(cacheKey) !== null;
  const shouldShowLoading = !silent && !hasCachedData;

  if (shouldShowLoading) {
    loading.value = true;
  }

  if (!silent) {
    error.value = null;
  }

  try {
    const res = await transactionService.getList(pageSize.value, skip, {
      forceRefresh,
    });
    if (myRequestId !== currentRequestId) return;
    total.value = res?.totalCount || 0;
    transactions.value = res?.result || [];
    enrichTransactions(transactions.value).catch((err) => {
      if (import.meta.env.DEV) console.warn("Transfer summary enrichment failed:", err);
    });
  } catch (err) {
    if (myRequestId !== currentRequestId) return;
    if (import.meta.env.DEV) console.error("Failed to load transactions:", err);

    if (!silent || transactions.value.length === 0) {
      error.value = "Failed to load transactions. Please try again.";
      transactions.value = [];
    }
  } finally {
    if (myRequestId === currentRequestId && shouldShowLoading) {
      loading.value = false;
    }
  }
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    router.push("/transactions/" + page).catch(() => {});
  }
}

function changePageSize(size) {
  pageSize.value = size;
  router.push("/transactions/1").catch(() => {});
}

async function loadMore() {
  if (loadingMore.value || currentPage.value >= totalPages.value) return;

  loadingMore.value = true;
  const nextPage = currentPage.value + 1;
  const skip = (nextPage - 1) * pageSize.value;

  try {
    const res = await transactionService.getList(pageSize.value, skip, {
      forceRefresh: true,
    });
    if (res?.result?.length > 0) {
      transactions.value = [...transactions.value, ...res.result];
      currentPage.value = nextPage;
      total.value = res.totalCount || total.value;
      enrichTransactions(res.result).catch((err) => {
        if (import.meta.env.DEV) console.warn("Transfer summary enrichment failed:", err);
      });
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error("Failed to load more transactions:", err);
    }
  } finally {
    loadingMore.value = false;
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = setInterval(() => {
    loadPage({ silent: true, forceRefresh: true });
  }, getNetworkRefreshIntervalMs());
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function exportData() {
  if (!transactions.value || transactions.value.length === 0) return;
  exportTransactionsToCSV(transactions.value);
}

// Watch route param for page changes
watch(
  () => route.params.page,
  (page) => {
    currentPage.value = Math.max(1, parseInt(page) || 1);
    loadPage();
  },
  { immediate: true }
);

onMounted(() => {
  startAutoRefresh();
});

onBeforeUnmount(() => {
  stopAutoRefresh();
});
</script>
