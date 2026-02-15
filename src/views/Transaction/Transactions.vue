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
        v-if="totalCount > 0"
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
          More than {{ formatNumber(totalCount) }} transactions found
        </span>
      </div>

      <!-- Main Card -->
      <div class="etherscan-card overflow-hidden">
        <!-- Card Header -->
        <div class="card-header flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-text-secondary dark:text-gray-400">
            Showing {{ startRecord }} to {{ endRecord }} of {{ formatNumber(totalCount) }} transactions
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
          <ErrorState title="Failed to load transactions" :message="error" @retry="() => loadPage(currentPage)" />
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
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { transactionService } from "@/services";
import { getCacheKey } from "@/services/cache";
import { useI18n } from "vue-i18n";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { usePagination } from "@/composables/usePagination";
import { useLoadMore } from "@/composables/useLoadMore";
import { formatNumber } from "@/utils/explorerFormat";
import { useTransferSummary } from "@/composables/useTransferSummary";
import { exportTransactionsToCSV } from "@/utils/dataExport";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import InfiniteScroll from "@/components/common/InfiniteScroll.vue";
import TransactionTable from "./components/TransactionTable.vue";

const showAbsoluteTime = ref(false);
const { t } = useI18n();

const { transferSummaryByHash, enrichTransactions } = useTransferSummary();

const breadcrumbs = [{ label: "Home", to: "/homepage" }, { label: "Transactions" }];

// --- Pagination via composable (route-synced, cache-aware) ---
const paginationState = usePagination((limit, skip, opts) => transactionService.getList(limit, skip, opts), {
  routeSync: { basePath: "/transactions" },
  cacheKeyFn: (limit, skip) => getCacheKey("tx_list", { limit, skip }),
  errorMessage: t("errors.loadTransactions"),
});

const {
  items: transactions,
  loading,
  error,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  startRecord,
  endRecord,
  loadPage,
} = paginationState;

// Enrich transactions after each page load
watch(transactions, (txs) => {
  if (txs?.length) {
    enrichTransactions(txs).catch((err) => {
      if (import.meta.env.DEV) console.warn("Transfer summary enrichment failed:", err);
    });
  }
});

// --- Load more (infinite scroll) via composable ---
const { loadingMore, loadMore } = useLoadMore(
  (limit, skip, opts) => transactionService.getList(limit, skip, opts),
  paginationState,
  {
    onAppend: (newItems) => {
      enrichTransactions(newItems).catch((err) => {
        if (import.meta.env.DEV) console.warn("Transfer summary enrichment failed:", err);
      });
    },
  }
);

// Auto-refresh via composable (handles cleanup + visibility pause)
const { start: startAutoRefresh } = useAutoRefresh(() => {
  loadPage(currentPage.value, { silent: true, forceRefresh: true });
});

function exportData() {
  if (!transactions.value || transactions.value.length === 0) return;
  exportTransactionsToCSV(transactions.value);
}

onMounted(() => {
  startAutoRefresh();
});
</script>
