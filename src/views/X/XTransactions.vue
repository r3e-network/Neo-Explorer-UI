<template>
  <div class="x-transactions-page">
    <section class="page-container py-6 md:py-8">
      <!-- Page Hero -->
      <PageHero :particles="3" class="animate-page-enter">
        <Breadcrumb :items="breadcrumbs" />

        <div class="mb-6 flex items-center gap-3">
          <div class="page-header-icon bg-icon-primary text-primary-500">
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
            <h1 class="page-title">{{ tf("pageTitles.xTransactions", "Neo X Transactions") }}</h1>
            <p class="page-subtitle">{{ tf("neoX.transactionsSubtitle", "Transactions on the Neo X EVM network") }}</p>
          </div>
        </div>
      </PageHero>

      <!-- Stats Bar -->
      <div class="mb-5 grid grid-cols-2 gap-4 animate-page-enter animate-page-enter-delay-1">
        <DashboardStatCard
          :label="tf('neoX.statTotalTxns', 'Total Transactions')"
          :value="stats ? stats.totalTransactions : null"
          :animated="!statsLoading"
          :icon="totalTxnsIcon"
          glow-color="#4f8fff"
          subtitle=""
        />
        <DashboardStatCard
          :label="tf('neoX.statTxnsToday', 'Transactions Today')"
          :value="stats ? stats.transactionsToday : null"
          :animated="!statsLoading"
          :icon="txnsTodayIcon"
          glow-color="#00b377"
          subtitle=""
        />
      </div>

      <!-- Transaction List Card -->
      <div class="etherscan-card overflow-hidden animate-page-enter animate-page-enter-delay-2">
        <div class="card-header">
          <p class="text-mid text-sm">
            <template v-if="stats && stats.totalTransactions > 0">
              {{ formatInt(stats.totalTransactions) }} {{ tf("neoX.transactionsFound", "transactions found") }}
            </template>
            <template v-else>{{ tf("neoX.latestTransactions", "Latest Transactions") }}</template>
          </p>
          <button
            type="button"
            class="btn-outline gap-1.5 px-3 py-1.5 text-xs"
            :disabled="exporting || items.length === 0"
            :title="tf('neoX.exportCsvTitle', 'Export the loaded rows to CSV')"
            @click="exportData"
          >
            <svg v-if="!exporting" class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <svg v-else class="h-3.5 w-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12a8 8 0 018-8" />
            </svg>
            {{ tf("neoX.exportCsv", "Export CSV") }}
          </button>
        </div>

        <!-- Loading Skeleton -->
        <div v-if="loading" class="soft-divider divide-y">
          <div v-for="i in PAGE_SIZE" :key="i" class="flex items-center gap-4 px-4 py-3">
            <Skeleton width="180px" height="16px" />
            <Skeleton width="60px" height="24px" variant="rounded" />
            <Skeleton width="70px" height="16px" />
            <Skeleton width="140px" height="16px" class="hidden md:block" />
            <Skeleton width="80px" height="16px" class="hidden lg:block" />
            <Skeleton width="70px" height="16px" class="hidden lg:block" />
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-6">
          <ErrorState
            :title="tf('neoX.transactionsErrorTitle', 'Unable to load transactions')"
            :message="tf('errors.loadFailed', 'Failed to load Neo X transactions.')"
            @retry="refresh"
          />
        </div>

        <!-- Empty State -->
        <EmptyState v-else-if="items.length === 0" :message="tf('neoX.noTransactions', 'No transactions')" icon="tx" />

        <!-- Table -->
        <XTxTable v-else :transactions="items" />

        <!-- Pagination -->
        <div v-if="!loading && items.length > 0" class="soft-divider border-t px-4 py-3">
          <InfiniteScroll :auto="false" :loading="loadingMore" :has-more="hasMore" @load-more="loadMore" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { useCursorList } from "@/composables/useCursorList";
import { getNeoxNet } from "@/utils/neoxEnv";
import { NETWORK_CHANGE_EVENT } from "@/utils/env";
import { transactionService, statsService } from "@/services/neox";
import { formatInt } from "@/utils/neoxFormat";
import { exportXTransactionsCsv } from "@/utils/neoxExport";
import PageHero from "@/components/common/PageHero.vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import DashboardStatCard from "@/components/charts/DashboardStatCard.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import InfiniteScroll from "@/components/common/InfiniteScroll.vue";
import XTxTable from "./components/XTxTable.vue";

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const PAGE_SIZE = 20;

const breadcrumbs = computed(() => [
  { label: tf("breadcrumb.home", "Home"), to: "/homepage" },
  { label: tf("neoX.chainName", "Neo X"), to: "/x" },
  { label: tf("breadcrumb.transactions", "Transactions") },
]);

// Icon SVGs for DashboardStatCard
const totalTxnsIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>`;
const txnsTodayIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`;

// --- Stats bar (Blockscout /stats) ---
const stats = ref(null);
const statsLoading = ref(true);
let statsSeq = 0;

async function loadStats() {
  const seq = ++statsSeq;
  stats.value = null;
  statsLoading.value = true;
  try {
    const result = await statsService.getStats({ net: getNeoxNet() });
    if (seq !== statsSeq) return;
    stats.value = result;
  } catch (_err) {
    if (seq !== statsSeq) return;
    stats.value = null;
  } finally {
    if (seq === statsSeq) statsLoading.value = false;
  }
}

// --- Cursor list ---
const { items, loading, loadingMore, error, hasMore, loadMore, refresh } = useCursorList((cursor, ctx) =>
  transactionService.getList({ net: getNeoxNet(), cursor, signal: ctx.signal })
);

// --- CSV export of the currently loaded rows ---
const exporting = ref(false);

function exportData() {
  if (exporting.value || items.value.length === 0) return;
  exporting.value = true;
  try {
    const first = items.value[0]?.blockIndex;
    const last = items.value[items.value.length - 1]?.blockIndex;
    exportXTransactionsCsv(items.value, `neox-transactions-${first}-${last}`);
  } finally {
    exporting.value = false;
  }
}

onMounted(() => {
  loadStats();
  window.addEventListener(NETWORK_CHANGE_EVENT, loadStats);
});
onBeforeUnmount(() => {
  window.removeEventListener(NETWORK_CHANGE_EVENT, loadStats);
  statsSeq += 1; // invalidate any in-flight stats request
});
</script>
