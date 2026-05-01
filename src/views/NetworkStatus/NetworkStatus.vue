<template>
  <div class="network-status-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
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
          <h1 class="page-title">{{ $t("pages.networkStatus.title") }}</h1>
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
                <th class="table-header-cell">{{ $t("pages.networkStatus.colSeed") }}</th>
                <th class="table-header-cell-right">{{ $t("pages.networkStatus.colHeight") }}</th>
                <th class="table-header-cell-right">{{ $t("pages.networkStatus.colLatency") }}</th>
                <th class="table-header-cell">{{ $t("pages.networkStatus.colVersion") }}</th>
                <th class="table-header-cell">{{ $t("pages.networkStatus.colStatus") }}</th>
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
      <div class="etherscan-card overflow-hidden">
        <div class="card-header">
          <div>
            <h2 class="text-high text-base font-semibold">{{ $t("pages.networkStatus.blockTimeTitle") }}</h2>
            <p class="text-low mt-1 text-xs">{{ $t("pages.networkStatus.blockTimeSubtitle") }}</p>
          </div>
        </div>
        <div v-if="loading && latestBlocks.length === 0" class="space-y-2 p-4">
          <Skeleton v-for="i in 8" :key="i" height="20px" />
        </div>
        <div v-else-if="!loading && latestBlocks.length === 0" class="p-6">
          <EmptyState :message="$t('pages.networkStatus.noData')" />
        </div>
        <div v-else class="p-4">
          <!-- Compact ASCII-style sparkline using flex bars, no chart lib -->
          <div class="flex items-end gap-[2px] h-32">
            <div
              v-for="b in latestBlocks"
              :key="b.height"
              class="flex-1 rounded-t-sm transition-colors"
              :class="b.interval > 5 ? 'bg-amber-400/70' : 'bg-emerald-500/70'"
              :style="{ height: `${Math.min(100, (b.interval / Math.max(maxInterval, 1)) * 100)}%` }"
              :title="`#${b.height} — ${b.interval}s — ${b.tx} tx`"
            ></div>
          </div>
          <div class="text-low mt-2 flex justify-between text-[10px] font-mono">
            <span>#{{ formatNumber(latestBlocks[0]?.height) }}</span>
            <span>#{{ formatNumber(latestBlocks[latestBlocks.length - 1]?.height) }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import { formatNumber } from "@/utils/explorerFormat";
import { getNetworkHealth, getLatestBlocks } from "@/services/networkMonitorService";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { getCurrentEnv, NET_ENV } from "@/utils/env";

function isTestnetEnv() {
  return getCurrentEnv() === NET_ENV.TestT5;
}

const { t } = useI18n();

const loading = ref(true);
const health = ref({ online: 0, total: 0, tip: 0, healthy: false, seeds: [] });
const latestBlocks = ref([]);
let pollTimer = null;

const STALE_HEIGHT_WINDOW = 2;

function currentEnv() {
  return isTestnetEnv() ? "testnet" : "mainnet";
}

const maxInterval = computed(() => latestBlocks.value.reduce((m, b) => Math.max(m, b.interval || 0), 0));

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

async function refresh() {
  const env = currentEnv();
  const [healthRes, blocksRes] = await Promise.all([
    getNetworkHealth(env, STALE_HEIGHT_WINDOW),
    getLatestBlocks(env),
  ]);
  health.value = healthRes;
  latestBlocks.value = blocksRes;
  loading.value = false;
}

function handleNetworkChange() {
  loading.value = true;
  health.value = { online: 0, total: 0, tip: 0, healthy: false, seeds: [] };
  latestBlocks.value = [];
  void refresh();
}

useNetworkChange(handleNetworkChange);

onMounted(() => {
  void refresh();
  // 30s poll matches the seed-status TTL; the underlying service caches
  // shorter so we never thrash the upstream.
  pollTimer = setInterval(() => void refresh(), 30 * 1000);
});

onBeforeUnmount(() => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
});
</script>
