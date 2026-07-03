<template>
  <div class="network-status-page">
    <PageHero :particles="3">
      <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8 animate-page-enter">
        <Breadcrumb
          :items="[
            { label: $t('breadcrumb.home'), to: '/homepage' },
            { label: $t('nav.networkStatus') },
          ]"
        />

        <div class="mb-6 flex items-center gap-3">
          <div class="page-header-icon bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </div>
          <div>
            <h1 class="page-title neon-glow-text">{{ $t("pages.networkStatus.title") }}</h1>
            <p class="page-subtitle">
              {{ $t("pages.networkStatus.subtitle") }}
              <span class="ml-2 text-low text-xs">
                {{ $t("pages.networkStatus.sourceNote") }}
                <a
                  href="https://monitor.ngd.network/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="etherscan-link"
                  >{{ $t("pages.networkStatus.sourceLink") }}</a
                >
              </span>
            </p>
          </div>
        </div>
      </section>
    </PageHero>

    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8 animate-page-enter animate-page-enter-delay-1">

      <!-- Summary tiles -->
      <div class="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="etherscan-card p-4">
          <div class="text-low text-xs font-semibold uppercase tracking-wider">
            {{ $t("pages.networkStatus.networkTip") }}
          </div>
          <div class="mt-2 text-2xl font-bold text-high">
            {{ formatNumber(health.tip) }}
          </div>
        </div>
        <div class="etherscan-card p-4">
          <div class="text-low text-xs font-semibold uppercase tracking-wider">
            {{ $t("pages.networkStatus.seedsTitle") }}
          </div>
          <div class="mt-2 flex items-center gap-2 text-2xl font-bold">
            <span :class="health.healthy ? 'text-success' : 'text-amber-500'">
              {{ health.online }}
            </span>
            <span class="text-low">/ {{ health.total }}</span>
            <span
              v-if="health.total > 0"
              class="ml-1 inline-block h-2 w-2 rounded-full"
              :class="health.healthy ? 'bg-success' : 'bg-amber-500'"
            ></span>
          </div>
          <div class="mt-1 text-low text-xs">
            {{ $t("pages.networkStatus.onlineCount", { online: health.online, total: health.total }) }}
          </div>
        </div>
        <div class="etherscan-card p-4">
          <div class="text-low text-xs font-semibold uppercase tracking-wider">
            {{ $t("pages.networkStatus.avgBlockTime") }}
          </div>
          <div class="mt-2 text-2xl font-bold text-high">
            {{ avgBlockTime.toFixed(2) }}
          </div>
          <div class="mt-1 text-low text-xs">{{ $t("pages.networkStatus.avgBlockTimeUnit") }}</div>
        </div>
        <div class="etherscan-card p-4">
          <div class="text-low text-xs font-semibold uppercase tracking-wider">
            {{ $t("pages.networkStatus.avgTxPerBlock") }}
          </div>
          <div class="mt-2 text-2xl font-bold text-high">{{ avgTxPerBlock.toFixed(2) }}</div>
          <div class="mt-1 text-low text-xs">
            {{ $t("pages.networkStatus.blocksObserved") }}: {{ formatNumber(latestBlocks.length) }}
          </div>
        </div>
      </div>

      <!-- Explorer indexer freshness -->
      <div class="etherscan-card mb-6 overflow-hidden">
        <div class="card-header flex-wrap gap-3">
          <div>
            <h2 class="text-high text-base font-semibold">{{ $t("pages.networkStatus.indexerTitle") }}</h2>
            <p class="text-low mt-1 text-xs">{{ $t("pages.networkStatus.indexerSubtitle") }}</p>
          </div>
          <span
            v-if="indexerSnapshot"
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="indexerStatusClass"
          >
            <span class="inline-block h-1.5 w-1.5 rounded-full" :class="indexerStatusDotClass"></span>
            {{ indexerStatusLabel }}
          </span>
        </div>
        <div v-if="indexerLoading && !indexerSnapshot" class="space-y-3 p-4">
          <Skeleton v-for="i in 4" :key="i" height="32px" />
        </div>
        <div v-else-if="!indexerSnapshot" class="p-6">
          <EmptyState :message="$t('pages.networkStatus.noIndexerData')" />
        </div>
        <div v-else class="p-4">
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <div class="text-low text-xs font-semibold uppercase tracking-wider">
                {{ $t("pages.networkStatus.indexedHeight") }}
              </div>
              <div class="mt-1 text-xl font-bold text-high">{{ formatNumber(indexerStatus.lastIndexedBlock) }}</div>
              <div class="text-low mt-1 text-xs">{{ $t("pages.networkStatus.updatedAt") }} {{ formatDateTime(indexerStatus.updatedAt) }}</div>
            </div>
            <div>
              <div class="text-low text-xs font-semibold uppercase tracking-wider">
                {{ $t("pages.networkStatus.chainTipHeight") }}
              </div>
              <div class="mt-1 text-xl font-bold text-high">{{ formatNumber(indexerStatus.chainTipBlock) }}</div>
              <div class="text-low mt-1 text-xs">{{ $t("pages.networkStatus.lagBlocks") }} {{ formatNumber(indexerStatus.lagBlocks) }}</div>
            </div>
            <div>
              <div class="text-low text-xs font-semibold uppercase tracking-wider">
                {{ $t("pages.networkStatus.dataFreshness") }}
              </div>
              <div class="mt-1 text-xl font-bold text-high">{{ formatDuration(indexerStatus.freshnessSeconds) }}</div>
              <div class="text-low mt-1 text-xs">
                {{ $t("pages.networkStatus.maxFreshness") }} {{ formatDuration(indexerStatus.maxFreshnessSeconds) }}
              </div>
            </div>
            <div>
              <div class="text-low text-xs font-semibold uppercase tracking-wider">
                {{ $t("pages.networkStatus.syncProgress") }}
              </div>
              <div class="mt-1 text-xl font-bold text-high">{{ formatPercent(indexerStatus.syncRatio) }}</div>
              <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  class="h-full rounded-full bg-emerald-500 transition-all"
                  :style="{ width: `${Math.max(1, Math.min(100, indexerStatus.syncRatio * 100))}%` }"
                ></div>
              </div>
            </div>
          </div>

          <div class="soft-divider mt-4 grid gap-4 border-t pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
            <div class="overflow-x-auto">
              <table class="w-full min-w-[520px]" :aria-label="$t('pages.networkStatus.indexerSummaryTitle')">
                <tbody class="soft-divider divide-y">
                  <tr>
                    <th scope="row" class="table-header-cell">{{ $t("pages.networkStatus.indexedTxCount") }}</th>
                    <td class="table-cell-right font-medium">{{ formatNumber(indexerSummary.indexedTxCount) }}</td>
                  </tr>
                  <tr>
                    <th scope="row" class="table-header-cell">{{ $t("pages.networkStatus.totalTxCount") }}</th>
                    <td class="table-cell-right font-medium">{{ formatNumber(indexerSummary.totalTxCount) }}</td>
                  </tr>
                  <tr>
                    <th scope="row" class="table-header-cell">{{ $t("pages.networkStatus.activeAddresses7d") }}</th>
                    <td class="table-cell-right font-medium">{{ formatNumber(indexerSummary.activeAddressCount7d) }}</td>
                  </tr>
                  <tr>
                    <th scope="row" class="table-header-cell">{{ $t("pages.networkStatus.summarySource") }}</th>
                    <td class="table-cell-right font-medium">{{ displayValue(indexerSummary.summarySource) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="min-w-0">
              <div class="mb-2 flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <div class="min-w-0">
                  <h3 class="text-high text-sm font-semibold">{{ $t("pages.networkStatus.edgeDiagnosticsTitle") }}</h3>
                  <p class="text-low mt-0.5 text-xs">{{ $t("pages.networkStatus.edgeDiagnosticsSubtitle") }}</p>
                </div>
                <span class="text-low text-xs sm:shrink-0 sm:whitespace-nowrap sm:text-right">{{ $t("pages.networkStatus.checkedAt") }} {{ formatDateTime(indexerSnapshot.checkedAt) }}</span>
              </div>
              <div v-if="recentIndexerObservations.length === 0" class="text-low text-sm">
                {{ $t("pages.networkStatus.noEdgeData") }}
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="observation in recentIndexerObservations"
                  :key="`${observation.timestamp}-${observation.url}-${observation.requestId || observation.status}`"
                  class="soft-divider rounded-md border px-3 py-2"
                >
                  <div class="flex min-w-0 items-center justify-between gap-2">
                    <span class="min-w-0 flex-1 truncate font-mono text-xs text-high" :title="observation.url">{{ observation.url }}</span>
                    <span class="text-low shrink-0 text-xs">{{ observation.status || "200" }}</span>
                  </div>
                  <div class="mt-2 grid min-w-0 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                    <span class="min-w-0 break-words"><span class="text-low">{{ $t("pages.networkStatus.edgeCache") }}:</span> {{ displayValue(observation.neo3furaCache || observation.edgeCache) }}</span>
                    <span class="min-w-0 break-words"><span class="text-low">{{ $t("pages.networkStatus.edgeRequest") }}:</span> {{ displayValue(observation.requestId) }}</span>
                    <span class="min-w-0 break-words"><span class="text-low">{{ $t("pages.networkStatus.edgeTarget") }}:</span> {{ displayValue(observation.proxyTarget || observation.upstreamSource) }}</span>
                    <span class="min-w-0 break-words"><span class="text-low">{{ $t("pages.networkStatus.edgeTiming") }}:</span> {{ formatServerTiming(observation) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Seeds table -->
      <div class="etherscan-card mb-6 overflow-hidden">
        <div class="card-header">
          <div>
            <h2 class="text-high text-base font-semibold">{{ $t("pages.networkStatus.seedsTitle") }}</h2>
            <p class="text-low mt-1 text-xs">{{ $t("pages.networkStatus.seedsSubtitle") }}</p>
          </div>
        </div>
        <div v-if="loading && health.seeds.length === 0" class="space-y-2 p-4">
          <Skeleton v-for="i in 5" :key="i" height="40px" />
        </div>
        <div v-else-if="!loading && health.seeds.length === 0" class="p-6">
          <EmptyState :message="$t('pages.networkStatus.noData')" />
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[640px]" :aria-label="$t('pages.networkStatus.seedsTitle')">
            <thead class="table-head">
              <tr>
                <th scope="col" class="table-header-cell">{{ $t("pages.networkStatus.colSeed") }}</th>
                <th scope="col" class="table-header-cell-right">{{ $t("pages.networkStatus.colHeight") }}</th>
                <th scope="col" class="table-header-cell-right">{{ $t("pages.networkStatus.colLatency") }}</th>
                <th scope="col" class="table-header-cell">{{ $t("pages.networkStatus.colVersion") }}</th>
                <th scope="col" class="table-header-cell">{{ $t("pages.networkStatus.colStatus") }}</th>
              </tr>
            </thead>
            <tbody class="soft-divider divide-y">
              <tr v-for="seed in health.seeds" :key="seed.endpoint" class="list-row group">
                <td class="table-cell font-mono text-sm">{{ seed.endpoint }}</td>
                <td class="table-cell-right font-medium">{{ formatNumber(seed.height) }}</td>
                <td class="table-cell-right">{{ seed.latency }} ms</td>
                <td class="table-cell text-sm text-mid">{{ seed.version }}</td>
                <td class="table-cell">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="seedStatusClass(seed)"
                  >
                    <span class="inline-block h-1.5 w-1.5 rounded-full" :class="seedStatusDotClass(seed)"></span>
                    {{ seedStatusLabel(seed) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent block activity -->
      <BlockTimeChart :blocks="latestBlocks" :loading="loading" />
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import PageHero from "@/components/common/PageHero.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import BlockTimeChart from "@/components/common/BlockTimeChart.vue";
import { formatNumber } from "@/utils/explorerFormat";
import { getNetworkHealth, getLatestBlocks } from "@/services/networkMonitorService";
import { getIndexerHealthSnapshot } from "@/services/indexerStatusService";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { getCurrentEnv, NET_ENV } from "@/utils/env";

function isTestnetEnv() {
  return getCurrentEnv() === NET_ENV.TestT5;
}

const { t } = useI18n();

const loading = ref(true);
const indexerLoading = ref(true);
const health = ref({ online: 0, total: 0, tip: 0, healthy: false, seeds: [] });
const latestBlocks = ref([]);
const indexerSnapshot = ref(null);
let pollTimer = null;

const STALE_HEIGHT_WINDOW = 2;

function currentEnv() {
  return isTestnetEnv() ? "testnet" : "mainnet";
}

const avgBlockTime = computed(() => {
  if (!latestBlocks.value.length) return 0;
  const total = latestBlocks.value.reduce((s, b) => s + (Number(b.interval) || 0), 0);
  return total / latestBlocks.value.length;
});

const avgTxPerBlock = computed(() => {
  if (!latestBlocks.value.length) return 0;
  const total = latestBlocks.value.reduce((s, b) => s + (Number(b.tx) || 0), 0);
  return total / latestBlocks.value.length;
});

const indexerStatus = computed(() => indexerSnapshot.value?.status || {
  ready: false,
  reason: "status_unavailable",
  lastIndexedBlock: -1,
  chainTipBlock: -1,
  lagBlocks: 0,
  freshnessSeconds: 0,
  maxFreshnessSeconds: 300,
  syncRatio: 0,
});

const indexerSummary = computed(() => indexerSnapshot.value?.summary || {
  indexedTxCount: 0,
  totalTxCount: 0,
  activeAddressCount7d: 0,
  summarySource: "",
});

const recentIndexerObservations = computed(() => indexerSnapshot.value?.observations || []);

const indexerStatusLabel = computed(() => {
  if (indexerStatus.value.ready) return t("pages.networkStatus.statusHealthy");
  if (indexerStatus.value.reason === "indexer_stale") return t("pages.networkStatus.statusLagging");
  return t("pages.networkStatus.statusOffline");
});

const indexerStatusClass = computed(() => {
  if (indexerStatus.value.ready) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (indexerStatus.value.reason === "indexer_stale") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
});

const indexerStatusDotClass = computed(() => {
  if (indexerStatus.value.ready) return "bg-emerald-500";
  if (indexerStatus.value.reason === "indexer_stale") return "bg-amber-500";
  return "bg-red-500";
});

function seedStatus(seed) {
  if (!seed || !health.value.tip) return "offline";
  const lag = health.value.tip - Number(seed.height || 0);
  if (lag <= STALE_HEIGHT_WINDOW) return "healthy";
  if (lag <= 30) return "lagging";
  return "offline";
}

function seedStatusLabel(seed) {
  return t(`pages.networkStatus.status${seedStatus(seed) === "healthy" ? "Healthy" : seedStatus(seed) === "lagging" ? "Lagging" : "Offline"}`);
}

function seedStatusClass(seed) {
  const s = seedStatus(seed);
  if (s === "healthy") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (s === "lagging") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
}

function seedStatusDotClass(seed) {
  const s = seedStatus(seed);
  if (s === "healthy") return "bg-emerald-500";
  if (s === "lagging") return "bg-amber-500";
  return "bg-red-500";
}

function displayValue(value) {
  const text = String(value || "").trim();
  return text || "N/A";
}

function formatDuration(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return "N/A";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "N/A";
  return `${(Math.max(0, Math.min(1, number)) * 100).toFixed(2)}%`;
}

function formatDateTime(value) {
  const text = String(value || "").trim();
  if (!text) return "N/A";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleString();
}

function formatServerTiming(observation) {
  const metrics = Array.isArray(observation?.serverTimingMetrics) ? observation.serverTimingMetrics : [];
  const compact = metrics
    .map((metric) => {
      const name = String(metric.name || "").trim();
      if (!name) return "";
      if (Number.isFinite(Number(metric.durationMs))) return `${name} ${Number(metric.durationMs).toFixed(1)}ms`;
      return metric.description ? `${name} ${metric.description}` : name;
    })
    .filter(Boolean)
    .join(", ");
  return compact || displayValue(observation?.serverTiming);
}

async function refresh() {
  const env = currentEnv();
  indexerLoading.value = true;
  try {
    const [healthRes, blocksRes, indexerRes] = await Promise.all([
      getNetworkHealth(env, STALE_HEIGHT_WINDOW),
      getLatestBlocks(env),
      getIndexerHealthSnapshot(env, { forceRefresh: true }),
    ]);
    health.value = healthRes;
    latestBlocks.value = blocksRes;
    indexerSnapshot.value = indexerRes;
  } catch (err) {
    // Service layer already swallows fetch errors and returns empty
    // defaults, so this catch is a defensive belt-and-braces guard.
    // If anything unexpected throws, keep existing data on screen
    // instead of clearing it — better stale than blank.
    if (import.meta.env.DEV) console.warn("[networkStatus] refresh failed:", err);
  } finally {
    loading.value = false;
    indexerLoading.value = false;
  }
}

function handleNetworkChange() {
  loading.value = true;
  health.value = { online: 0, total: 0, tip: 0, healthy: false, seeds: [] };
  latestBlocks.value = [];
  indexerSnapshot.value = null;
  void refresh();
}

useNetworkChange(handleNetworkChange);

onMounted(() => {
  void refresh();
  // 30s poll matches the seed-status TTL; the underlying service caches
  // shorter so we never thrash the upstream.
  pollTimer = setInterval(() => {
    void refresh();
  }, 30 * 1000);
});

onBeforeUnmount(() => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
});
</script>
