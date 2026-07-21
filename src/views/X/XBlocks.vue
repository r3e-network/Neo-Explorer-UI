<template>
  <div class="x-blocks-page">
    <section class="page-container py-6 md:py-8">
      <!-- Page Hero -->
      <PageHero :particles="3" class="animate-page-enter">
        <Breadcrumb :items="breadcrumbs" />

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
            <h1 class="page-title">{{ tf("pageTitles.xBlocks", "Neo X Blocks") }}</h1>
            <p class="page-subtitle">{{ tf("neoX.blocksSubtitle", "Blocks produced on the Neo X EVM network") }}</p>
          </div>
        </div>
      </PageHero>

      <!-- Stats Bar -->
      <div class="mb-5 grid grid-cols-2 gap-4 animate-page-enter animate-page-enter-delay-1">
        <DashboardStatCard
          :label="tf('neoX.statTotalBlocks', 'Total Blocks')"
          :value="currentBlockHeight"
          :animated="!statsLoading"
          :icon="totalBlocksIcon"
          glow-color="#4f8fff"
          subtitle=""
        />
        <DashboardStatCard
          :label="tf('neoX.statAvgBlockTime', 'Avg Block Time')"
          :value="avgBlockTimeSec"
          :decimals="1"
          suffix=" s"
          :animated="!statsLoading"
          :icon="avgBlockTimeIcon"
          glow-color="#00b377"
          subtitle=""
        />
      </div>

      <!-- Block List Card -->
      <div class="etherscan-card overflow-hidden animate-page-enter animate-page-enter-delay-2">
        <div class="card-header">
          <p class="text-mid text-sm">
            <template v-if="items.length">
              {{ tf("neoX.block", "Block") }} #{{ formatInt(rangeEnd) }} {{ tf("neoX.rangeTo", "to") }} #{{ formatInt(rangeStart) }}
            </template>
            <template v-else>{{ tf("neoX.latestBlocks", "Latest Blocks") }}</template>
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
            <Skeleton width="60px" height="18px" />
            <Skeleton width="40%" height="18px" />
            <Skeleton width="30px" height="18px" />
            <Skeleton width="80px" height="18px" />
            <Skeleton width="60px" height="18px" />
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-6">
          <ErrorState
            :title="tf('neoX.blocksErrorTitle', 'Unable to load blocks')"
            :message="tf('errors.loadFailed', 'Failed to load Neo X blocks.')"
            @retry="refresh"
          />
        </div>

        <!-- Empty State -->
        <EmptyState v-else-if="items.length === 0" :message="tf('neoX.noBlocks', 'No blocks')" icon="block" />

        <!-- Table -->
        <XBlocksTable v-else :blocks="items" />

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
import { blockService, statsService } from "@/services/neox";
import { formatInt } from "@/utils/neoxFormat";
import { exportXBlocksCsv } from "@/utils/neoxExport";
import PageHero from "@/components/common/PageHero.vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import DashboardStatCard from "@/components/charts/DashboardStatCard.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import InfiniteScroll from "@/components/common/InfiniteScroll.vue";
import XBlocksTable from "./components/XBlocksTable.vue";

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const PAGE_SIZE = 20;

const breadcrumbs = computed(() => [
  { label: tf("breadcrumb.home", "Home"), to: "/homepage" },
  { label: tf("neoX.chainName", "Neo X"), to: "/x" },
  { label: tf("breadcrumb.blocks", "Blocks") },
]);

// Icon SVGs for DashboardStatCard
const totalBlocksIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z"/></svg>`;
const avgBlockTimeIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;

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

const avgBlockTimeSec = computed(() =>
  stats.value && stats.value.averageBlockTimeMs > 0 ? stats.value.averageBlockTimeMs / 1000 : null
);

// --- Cursor list ---
const { items, loading, loadingMore, error, hasMore, loadMore, refresh } = useCursorList((cursor, ctx) =>
  blockService.getList({ net: getNeoxNet(), cursor, signal: ctx.signal })
);

const blockIndices = computed(() =>
  items.value.map((b) => Number(b.index)).filter((i) => Number.isFinite(i))
);
const rangeStart = computed(() => (blockIndices.value.length ? Math.min(...blockIndices.value) : 0));
const rangeEnd = computed(() => (blockIndices.value.length ? Math.max(...blockIndices.value) : 0));
const currentBlockHeight = computed(() => {
  const heights = [stats.value?.totalBlocks, rangeEnd.value].map(Number).filter((value) => Number.isFinite(value) && value > 0);
  return heights.length ? Math.max(...heights) : null;
});

// --- CSV export of the currently loaded rows ---
const exporting = ref(false);

function exportData() {
  if (exporting.value || items.value.length === 0) return;
  exporting.value = true;
  try {
    const first = items.value[0]?.index;
    const last = items.value[items.value.length - 1]?.index;
    exportXBlocksCsv(items.value, `neox-blocks-${first}-${last}`, { net: getNeoxNet() });
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
