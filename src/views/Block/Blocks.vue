<template>
  <div class="blocks-page">
    <section class="page-container py-6 md:py-8">
      <!-- Breadcrumb -->
      <Breadcrumb :items="[{ label: $t('breadcrumb.home'), to: '/homepage' }, { label: $t('breadcrumb.blocks') }]" />

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
          <h1 class="page-title">{{ $t("nav.blocks") || $t("blocks.title") }}</h1>
          <p class="page-subtitle">{{ $t("blocks.subtitle") }}</p>
        </div>
      </div>

      <!-- Stats Bar -->
      <div class="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div class="surface-panel flex items-center gap-3 p-4">
          <div
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30"
          >
            <svg class="h-5 w-5 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-mid text-xs">{{ $t("blocks.stats.totalBlocks") }}</p>
            <p class="text-high truncate text-sm font-semibold">
              {{ statsLoading ? "..." : formatNumber(totalBlocks) }}
            </p>
          </div>
        </div>
        <div class="surface-panel flex items-center gap-3 p-4">
            <div
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30"
          >
            <svg class="h-5 w-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-mid text-xs">{{ $t("blocks.stats.latestBlock") }}</p>
            <p class="text-high truncate text-sm font-semibold">
              {{ statsLoading ? "..." : "#" + formatNumber(latestHeight) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Block List Card -->
      <div class="etherscan-card overflow-hidden">
        <div class="card-header">
          <p class="text-mid text-sm">
            {{ $t("blocks.range.label", { start: formatNumber(rangeStart), end: formatNumber(rangeEnd) }) }}
            <span class="hidden sm:inline">{{ $t("blocks.range.total", { count: formatNumber(totalCount) }) }}</span>
          </p>
          <div class="flex items-center gap-2">
            <button
              v-if="blocks.length > 0"
              @click="showAbsoluteTime = !showAbsoluteTime"
              class="btn-outline gap-1.5 px-3 py-1.5 text-xs md:hidden"
              type="button"
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {{ showAbsoluteTime ? $t("blocks.table.dateTimeUtc") : $t("blocks.table.age") }}
            </button>
            <button
              v-if="blocks.length > 0"
              @click="exportData"
              :disabled="exporting"
              class="btn-outline gap-1.5 px-3 py-1.5 text-xs"
              :title="$t('blocks.export.title')"
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
              {{ exporting ? `${$t("blocks.export.label")} (${exportProgress})` : $t("blocks.export.label") }}
            </button>
          </div>
        </div>

        <!-- Loading Skeleton -->
        <div v-if="loading" class="soft-divider divide-y">
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
          <ErrorState :title="$t('blocks.errorTitle')" :message="error" @retry="() => loadPage(currentPage)" />
        </div>

        <!-- Empty State -->
        <EmptyState v-else-if="blocks.length === 0" :message="$t('blocks.emptyMessage')" icon="block" />

        <!-- Table / Mobile cards -->
        <div v-else>
          <div v-if="!isDesktop" class="soft-divider divide-y" data-testid="blocks-mobile-list">
            <MobileListCard v-for="block in blocks" :key="block.hash" data-testid="block-mobile-card">
              <template #icon>
                <div class="bg-icon-primary flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold text-primary-500">
                  Bk
                </div>
              </template>

              <template #title>
                <router-link :to="`/block-info/${block.hash}`" class="etherscan-link font-medium">
                  #{{ formatNumber(block.index) }}
                </router-link>
              </template>

              <template #badge>
                <router-link
                  v-if="block.txcount > 0"
                  :to="`/block-info/${block.hash}`"
                  class="badge-soft whitespace-nowrap text-xs font-semibold"
                >
                  {{ formatNumber(block.txcount) }} txns
                </router-link>
                <span v-else class="badge-soft whitespace-nowrap text-xs font-semibold">0 txns</span>
              </template>

              <template #subtitle>
                <span :title="formatUnixTime(block.timestamp)">
                  {{ showAbsoluteTime ? formatUnixTime(block.timestamp) : formatAge(block.timestamp) }}
                </span>
              </template>

              <template #metrics>
                <div class="rounded bg-surface-muted px-3 py-2">
                  <dt class="text-[10px] uppercase text-low">Validator</dt>
                  <dd class="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-medium text-high">
                    <img
                      v-if="getActiveValidatorLogo(block)"
                      :src="getActiveValidatorLogo(block)"
                      :alt="getValidatorDisplayName(block) + ' logo'"
                      class="h-4 w-4 flex-shrink-0 rounded-full bg-surface-elevated object-cover ring-1 ring-line-soft"
                      onerror="this.src = '/img/brand/neo.png'"
                    />
                    <router-link
                      v-if="getActiveValidatorAddress(block)"
                      :to="`/account-profile/${getActiveValidatorAddress(block)}`"
                      class="etherscan-link min-w-0 truncate"
                      :title="getActiveValidatorAddress(block)"
                    >
                      {{ getValidatorDisplayName(block) }}
                    </router-link>
                    <span v-else class="text-low">--</span>
                  </dd>
                </div>
                <div class="rounded bg-surface-muted px-3 py-2">
                  <dt class="text-[10px] uppercase text-low">Size</dt>
                  <dd class="mt-1 text-sm font-medium text-high">{{ formatBytes(block.size) }}</dd>
                </div>
              </template>
            </MobileListCard>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[800px]" :aria-label="$t('blocks.ariaLabel')">
            <thead class="table-head">
              <tr>
                <th scope="col" class="table-header-cell">{{ $t("blocks.table.block") }}</th>
                <th scope="col"
                  class="table-header-cell cursor-pointer select-none hover:text-primary-500"
                  @click="showAbsoluteTime = !showAbsoluteTime"
                >
                  {{ showAbsoluteTime ? $t("blocks.table.dateTimeUtc") : $t("blocks.table.age") }}
                  <svg class="ml-0.5 inline h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                </th>
                <th scope="col" class="table-header-cell">{{ $t("blocks.table.txn") }}</th>
                <th scope="col" class="table-header-cell">{{ $t("blocks.table.validator") }}</th>
                <th scope="col" class="table-header-cell-right">{{ $t("blocks.table.size") }}</th>
              </tr>
            </thead>
            <tbody class="soft-divider divide-y">
              <tr v-for="block in blocks" :key="block.hash" class="list-row group">
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
                  <span v-else class="text-sm text-low">0</span>
                </td>
                <!-- Validator -->
                <td class="table-cell">
                  <div class="flex flex-col gap-0.5">
                    <div class="inline-flex items-center gap-1.5">
                      <img
                        v-if="getActiveValidatorLogo(block)"
                        :src="getActiveValidatorLogo(block)"
                        :alt="getValidatorDisplayName(block) + ' logo'"
                        class="h-4 w-4 rounded-full object-cover bg-surface-elevated ring-1 ring-line-soft"
                        onerror="this.src = '/img/brand/neo.png'"
                      />
                      <router-link
                        v-if="getActiveValidatorAddress(block)"
                        :to="`/account-profile/${getActiveValidatorAddress(block)}`"
                        class="etherscan-link text-sm font-semibold"
                      >
                        {{ getValidatorDisplayName(block) }}
                      </router-link>
                      <span
                        v-else-if="resolvePrimaryIndex(block) !== undefined"
                        class="text-sm font-semibold text-high"
                      >
                        {{ getValidatorDisplayName(block) }}
                      </span>
                    </div>
                    <router-link
                      v-if="getActiveValidatorAddress(block) && hasNamedValidatorIdentity(block)"
                      :to="`/account-profile/${getActiveValidatorAddress(block)}`"
                      :title="getActiveValidatorAddress(block)"
                      class="etherscan-link font-hash text-xs"
                    >
                      {{ truncateHash(getActiveValidatorAddress(block), 8, 6) }}
                    </router-link>
                    <span v-else-if="!getActiveValidatorAddress(block)" class="text-xs text-low">--</span>
                  </div>
                </td>
                <!-- Size -->
                <td class="table-cell-right text-xs">
                  {{ formatBytes(block.size) }}
                </td>
              </tr>
            </tbody>
            </table>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="!loading && blocks.length > 0" class="soft-divider border-t px-4 py-3">
          <InfiniteScroll :loading="loadingMore" :has-more="currentPage < totalPages" @load-more="loadMore" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useMediaQuery } from "@vueuse/core";
import { blockService } from "@/services/blockService";
import { statsService } from "@/services/statsService";
import { getCacheKey } from "@/services/cache";
import { createExplorerQueryKey, fetchFreshQuery } from "@/query/freshness";
import { useRealtimeHead } from "@/composables/useRealtimeHead";
import { usePagination } from "@/composables/usePagination";
import { useLoadMore } from "@/composables/useLoadMore";
import { formatAge, formatBytes, formatUnixTime, formatNumber, truncateHash } from "@/utils/explorerFormat";
import { scriptHashToAddress } from "@/utils/neoHelpers";
import { useCommittee, isFallbackValidatorName } from "@/composables/useCommittee";
import { resolveNetworkName } from "@/utils/env";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import InfiniteScroll from "@/components/common/InfiniteScroll.vue";
import MobileListCard from "@/components/common/MobileListCard.vue";
import { exportBlocksToCSV } from "@/utils/dataExport";
import { exportAllPagesToCsv } from "@/utils/pagedExport";

const { t } = useI18n();
const { resolvePrimaryIndex, getPrimaryNodeName, getPrimaryNodeAddress, getPrimaryNodeLogo, loadCommittee } = useCommittee();
const isDesktop = useMediaQuery("(min-width: 768px)");

const VALIDATOR_IDENTITY_WAIT_MS = 1500;

function waitForValidatorIdentity(timeoutMs = VALIDATOR_IDENTITY_WAIT_MS) {
  let timer = null;
  const committeePromise = Promise.resolve()
    .then(() => loadCommittee())
    .catch(() => null);

  return Promise.race([
    committeePromise.finally(() => {
      if (timer) clearTimeout(timer);
    }),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(null), timeoutMs);
    }),
  ]);
}

function getActiveValidatorAddress(block) {
  const resolvedPrimary = resolvePrimaryIndex(block);
  if (resolvedPrimary !== undefined) {
    const directAddr = getPrimaryNodeAddress(resolvedPrimary);
    if (directAddr) return scriptHashToAddress(directAddr);
  }
  return block.nextconsensus ? scriptHashToAddress(block.nextconsensus) : null;
}
function getActiveValidatorLogo(block) {
  const resolvedPrimary = resolvePrimaryIndex(block);
  if (resolvedPrimary === undefined) return null;
  return getPrimaryNodeLogo(resolvedPrimary) || null;
}

function hasNamedValidatorIdentity(block) {
  const resolvedPrimary = resolvePrimaryIndex(block);
  if (resolvedPrimary === undefined) return false;

  const name = String(getPrimaryNodeName(resolvedPrimary) || "").trim();
  if (!name) return false;
  if (name === t("validator.validator")) return false;
  return !isFallbackValidatorName(name);
}

function getValidatorDisplayName(block) {
  const resolvedPrimary = resolvePrimaryIndex(block);
  if (resolvedPrimary !== undefined) {
    const name = String(getPrimaryNodeName(resolvedPrimary) || "").trim();
    if (name && name !== t("validator.validator") && !isFallbackValidatorName(name)) {
      return name;
    }
  }

  const address = getActiveValidatorAddress(block);
  return address ? truncateHash(address, 8, 6) : "--";
}
const showAbsoluteTime = ref(false);

// Stats bar
const statsLoading = ref(true);
const totalBlocks = ref(0);
const latestHeight = ref(0);

// --- Pagination via composable (route-synced, cache-aware) ---
const blockFetchFn = async (limit, skip, opts) => {
  const validatorIdentityPromise = waitForValidatorIdentity();
  const page = await blockService.getList(limit, skip, opts);
  await validatorIdentityPromise;
  return page;
};

const {
  items: blocks,
  loading,
  error,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  loadPage,
} = usePagination(blockFetchFn, {
  routeSync: { basePath: "/blocks" },
  cacheKeyFn: (limit, skip, context = {}) =>
    getCacheKey("block_list", { limit, skip }, context.network),
  queryKeyFn: (limit, skip, context = {}) =>
    createExplorerQueryKey("blocks.list", { limit, skip, network: context.network }),
  querySource: "blocks.list",
  errorMessage: t("errors.loadBlocks"),
});

const { loadingMore, loadMore } = useLoadMore(blockFetchFn, {
  items: blocks,
  currentPage,
  pageSize,
  totalPages,
  totalCount,
}, {
  queryKeyFn: (limit, skip, context = {}) =>
    createExplorerQueryKey("blocks.list", { limit, skip, network: context.network }),
  querySource: "blocks.list",
});

// Range display
const rangeStart = computed(() => {
  const indices = blocks.value?.map((b) => Number(b.index)).filter((i) => Number.isFinite(i)) ?? [];
  return indices.length ? Math.min(...indices) : 0;
});
const rangeEnd = computed(() => {
  const indices = blocks.value?.map((b) => Number(b.index)).filter((i) => Number.isFinite(i)) ?? [];
  return indices.length ? Math.max(...indices) : 0;
});

// --- Stats ---
async function loadStats(forceRefresh = false) {
  const requestNetwork = resolveNetworkName();
  statsLoading.value = true;
  try {
    const stats = await fetchFreshQuery({
      forceRefresh,
      queryKey: createExplorerQueryKey("blocks.stats", { network: requestNetwork }),
      queryFn: ({ forceRefresh: queryForceRefresh }) =>
        statsService.getDashboardStats({ forceRefresh: queryForceRefresh, network: requestNetwork }),
      source: "blocks.stats",
    });
    if (resolveNetworkName() !== requestNetwork) return;
    totalBlocks.value = stats?.blocks || 0;
    latestHeight.value = totalBlocks.value > 0 ? totalBlocks.value - 1 : 0;
  } catch (err) {
    if (resolveNetworkName() !== requestNetwork) return;
    if (import.meta.env.DEV) console.warn("Failed to load block stats:", err);
  } finally {
    if (resolveNetworkName() === requestNetwork) {
      statsLoading.value = false;
    }
  }
}

// Auto-refresh via composable (handles cleanup + visibility pause)
const { start: startAutoRefresh } = useRealtimeHead(() => {
  loadPage(currentPage.value, { silent: true, forceRefresh: true });
  loadStats(true);
});

const exporting = ref(false);
const exportProgress = ref(0);

async function exportData() {
  if (!blocks.value || blocks.value.length === 0) return;
  const network = resolveNetworkName();
  // Full paginated export (up to 5000 rows) rather than just the visible page.
  exporting.value = true;
  exportProgress.value = 0;
  try {
    await exportAllPagesToCsv({
      fetchPage: (limit, offset) =>
        blockService.getList(limit, offset, {
          __suppressDevErrorLog: true,
          enrichMissingFields: true,
          network,
        }),
      exporter: (rows, filename) => exportBlocksToCSV(rows, filename),
      filename: `blocks_${Date.now()}`,
      pageSize: 100,
      maxRows: 5000,
      onPage: (received) => {
        exportProgress.value = received;
      },
    });
  } catch {
    exportBlocksToCSV(blocks.value);
  } finally {
    exporting.value = false;
    exportProgress.value = 0;
  }
}

onMounted(() => {
  loadStats();
  startAutoRefresh();
});
</script>
