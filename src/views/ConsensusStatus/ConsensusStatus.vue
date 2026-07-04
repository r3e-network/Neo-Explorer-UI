<template>
  <div class="consensus-status-page" data-testid="consensus-status-page">
    <PageHero :particles="3">
      <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8 animate-page-enter">
        <Breadcrumb
          :items="[
            { label: $t('breadcrumb.home'), to: '/homepage' },
            { label: $t('nav.consensusStatus') },
          ]"
        />

        <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="flex items-start gap-3">
            <div class="page-header-icon bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7h16M7 4v6M4 17h16M17 14v6M9 12h6" />
              </svg>
            </div>
            <div>
              <h1 class="page-title neon-glow-text">{{ $t("pages.consensusStatus.title") }}</h1>
              <p class="page-subtitle max-w-3xl">{{ $t("pages.consensusStatus.subtitle") }}</p>
              <p class="text-low mt-2 text-xs">
                {{ $t("pages.consensusStatus.sourceNote") }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="btn-outline inline-flex h-10 items-center justify-center gap-2 px-3 text-sm"
            :disabled="loading"
            @click="refresh"
          >
            <svg class="h-4 w-4" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v6h6M20 20v-6h-6M20 9A8 8 0 006.2 5.2L4 10m16 4-2.2 4.8A8 8 0 014 15" />
            </svg>
            {{ loading ? $t("pages.consensusStatus.refreshing") : $t("pages.consensusStatus.refresh") }}
          </button>
        </div>
      </section>
    </PageHero>

    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8 animate-page-enter animate-page-enter-delay-1">
      <div class="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="etherscan-card p-4" data-testid="consensus-summary-card">
          <div class="text-low text-xs font-semibold uppercase tracking-wider">{{ $t("pages.consensusStatus.networkTip") }}</div>
          <div class="mt-2 text-2xl font-bold text-high">{{ summary.latestHeight === null ? "N/A" : formatNumber(summary.latestHeight) }}</div>
          <div class="text-low mt-1 text-xs">{{ $t("pages.consensusStatus.blocksObserved", { count: formatNumber(summary.observedBlocks) }) }}</div>
        </div>
        <div class="etherscan-card p-4" data-testid="consensus-summary-card">
          <div class="text-low text-xs font-semibold uppercase tracking-wider">{{ $t("pages.consensusStatus.avgLiveness") }}</div>
          <div class="mt-2 text-2xl font-bold" :class="summary.avgLiveness !== null && summary.avgLiveness >= 99 ? 'text-success' : 'text-amber-500'">
            {{ formatPercent(summary.avgLiveness) }}
          </div>
          <div class="text-low mt-1 text-xs">{{ $t("pages.consensusStatus.activeValidators", { count: summary.validatorCount }) }}</div>
        </div>
        <div class="etherscan-card p-4" data-testid="consensus-summary-card">
          <div class="text-low text-xs font-semibold uppercase tracking-wider">{{ $t("pages.consensusStatus.recentViewChanges") }}</div>
          <div class="mt-2 text-2xl font-bold" :class="summary.viewChanges > 0 ? 'text-amber-500' : 'text-success'">
            {{ formatNumber(summary.viewChanges) }}
          </div>
          <div class="text-low mt-1 text-xs">{{ $t("pages.consensusStatus.viewChangeHint") }}</div>
        </div>
        <div class="etherscan-card p-4" data-testid="consensus-summary-card">
          <div class="text-low text-xs font-semibold uppercase tracking-wider">{{ $t("pages.consensusStatus.overallStatus") }}</div>
          <div class="mt-2">
            <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold" :class="statusPillClass(summary.status)">
              <span class="inline-block h-1.5 w-1.5 rounded-full" :class="statusDotClass(summary.status)"></span>
              {{ statusLabel(summary.status) }}
            </span>
          </div>
          <div class="text-low mt-2 text-xs">{{ $t("pages.consensusStatus.lastUpdated") }} {{ lastUpdatedLabel }}</div>
        </div>
      </div>

      <div v-if="error" class="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {{ error }}
      </div>

      <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-high text-lg font-semibold">{{ $t("pages.consensusStatus.nodesTitle") }}</h2>
          <p class="text-low text-sm">{{ $t("pages.consensusStatus.nodesSubtitle") }}</p>
        </div>
        <div class="flex flex-wrap gap-2 text-xs">
          <span class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-600 dark:text-emerald-300">
            <span class="h-2 w-2 rounded-full bg-emerald-500"></span>{{ $t("pages.consensusStatus.legendOk") }}
          </span>
          <span class="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-red-600 dark:text-red-300">
            <span class="h-2 w-2 rounded-full bg-red-500"></span>{{ $t("pages.consensusStatus.legendViewChange") }}
          </span>
          <span class="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-1 text-mid">
            <span class="h-2 w-2 rounded-full bg-slate-400"></span>{{ $t("pages.consensusStatus.legendUnknown") }}
          </span>
        </div>
      </div>

      <div v-if="loading && !latestBlocks.length" class="grid gap-3">
        <Skeleton v-for="i in 7" :key="i" height="126px" />
      </div>
      <div v-else class="grid gap-3">
        <article
          v-for="node in consensusRows"
          :key="node.nodeIndex"
          class="etherscan-card p-4"
          data-testid="consensus-node-card"
        >
          <div class="grid gap-4 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.4fr)_minmax(220px,0.55fr)] lg:items-center">
            <div class="min-w-0">
              <div class="flex min-w-0 items-center gap-3">
                <img
                  v-if="visibleLogoUrl(node)"
                  :src="visibleLogoUrl(node)"
                  :alt="node.name"
                  class="h-10 w-10 shrink-0 rounded-lg border border-line-soft bg-white object-contain p-1 dark:bg-slate-900"
                  @error="markLogoFailed(node)"
                />
                <div v-else class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-sm font-bold text-primary-600 dark:text-primary-300">
                  {{ node.nodeIndex + 1 }}
                </div>
                <div class="min-w-0">
                  <div class="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 class="truncate text-base font-semibold text-high">{{ node.name }}</h3>
                    <span class="rounded-full bg-surface-subtle px-2 py-0.5 text-xs font-semibold text-mid">
                      #{{ node.nodeIndex }}
                    </span>
                  </div>
                  <p class="mt-1 truncate font-mono text-xs text-low" :title="node.address || $t('pages.consensusStatus.addressUnavailable')">
                    {{ node.address || $t("pages.consensusStatus.addressUnavailable") }}
                  </p>
                </div>
              </div>
            </div>

            <div class="min-w-0">
              <div class="mb-2 flex items-center justify-between gap-2 text-xs">
                <span class="font-semibold uppercase tracking-wider text-low">{{ $t("pages.consensusStatus.recentSlots") }}</span>
                <span class="text-low">{{ $t("pages.consensusStatus.latestOnRight") }}</span>
              </div>
              <div v-if="node.timeline.length" class="flex min-w-0 items-end gap-1 overflow-x-auto pb-1" data-testid="consensus-status-bars">
                <span
                  v-for="slot in node.timeline"
                  :key="`${node.nodeIndex}-${slot.height}`"
                  class="inline-block h-7 w-2 shrink-0 rounded-full"
                  :class="slotClass(slot)"
                  data-testid="consensus-timeline-bar"
                  :title="slotTitle(node, slot)"
                  :aria-label="slotTitle(node, slot)"
                ></span>
              </div>
              <div v-else class="rounded-md border border-dashed border-line-soft px-3 py-3 text-sm text-low">
                {{ $t("pages.consensusStatus.noSlots") }}
              </div>
            </div>

            <dl class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:grid-cols-2">
              <div>
                <dt class="text-low text-xs font-semibold uppercase">{{ $t("pages.consensusStatus.status") }}</dt>
                <dd class="mt-1">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold"
                    :class="statusPillClass(node.status)"
                    data-testid="consensus-node-status"
                  >
                    <span class="inline-block h-1.5 w-1.5 rounded-full" :class="statusDotClass(node.status)"></span>
                    {{ statusLabel(node.status) }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="text-low text-xs font-semibold uppercase">{{ $t("pages.consensusStatus.liveness") }}</dt>
                <dd class="mt-1 font-semibold text-high" data-testid="consensus-node-liveness">{{ formatPercent(node.livenessRatio) }}</dd>
              </div>
              <div>
                <dt class="text-low text-xs font-semibold uppercase">{{ $t("pages.consensusStatus.proposed") }}</dt>
                <dd class="mt-1 font-semibold text-high">{{ formatNumber(node.proposed) }}</dd>
              </div>
              <div>
                <dt class="text-low text-xs font-semibold uppercase">{{ $t("pages.consensusStatus.missed") }}</dt>
                <dd class="mt-1 font-semibold" :class="node.missed > 0 ? 'text-amber-500' : 'text-high'">
                  {{ formatNumber(node.missed) }}
                </dd>
              </div>
            </dl>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import PageHero from "@/components/common/PageHero.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import { useCommittee } from "@/composables/useCommittee";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { getLiveness } from "@/services/doraService";
import { getLatestBlocks } from "@/services/networkMonitorService";
import {
  buildConsensusStatusRows,
  buildConsensusStatusSummary,
} from "@/services/consensusStatusService";
import { formatNumber } from "@/utils/explorerFormat";
import { resolveNetworkName } from "@/utils/env";

const { t } = useI18n();
const {
  loadCommittee,
  getPrimaryNodeName,
  getPrimaryNodeAddress,
  getPrimaryNodeLogo,
} = useCommittee();

const loading = ref(true);
const error = ref("");
const latestBlocks = ref([]);
const livenessData = ref({});
const lastUpdated = ref(null);
const failedLogos = ref(new Set());
let pollTimer = null;

const consensusRows = computed(() =>
  buildConsensusStatusRows({
    blocks: latestBlocks.value,
    liveness: livenessData.value,
    resolveName: getPrimaryNodeName,
    resolveAddress: getPrimaryNodeAddress,
    resolveLogo: getPrimaryNodeLogo,
  })
);

const summary = computed(() => buildConsensusStatusSummary(consensusRows.value, latestBlocks.value));

const lastUpdatedLabel = computed(() => {
  if (!lastUpdated.value) return "N/A";
  return lastUpdated.value.toLocaleString();
});

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "N/A";
  return `${number.toFixed(2)}%`;
}

function statusLabel(status) {
  const key = {
    healthy: "statusHealthy",
    watch: "statusWatch",
    degraded: "statusDegraded",
    unknown: "statusUnknown",
  }[status] || "statusUnknown";
  return t(`pages.consensusStatus.${key}`);
}

function statusPillClass(status) {
  if (status === "healthy") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (status === "watch") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  if (status === "degraded") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function statusDotClass(status) {
  if (status === "healthy") return "bg-emerald-500";
  if (status === "watch") return "bg-amber-500";
  if (status === "degraded") return "bg-red-500";
  return "bg-slate-400";
}

function logoKey(node) {
  return `${node.nodeIndex}:${node.logoUrl || ""}`;
}

function visibleLogoUrl(node) {
  if (!node?.logoUrl) return "";
  return failedLogos.value.has(logoKey(node)) ? "" : node.logoUrl;
}

function markLogoFailed(node) {
  failedLogos.value = new Set([...failedLogos.value, logoKey(node)]);
}

function slotClass(slot) {
  if (slot.state === "ok") return "bg-emerald-500";
  if (slot.state === "view-change") return "bg-red-500";
  return "bg-slate-400";
}

function slotTitle(node, slot) {
  const statusText = slot.state === "view-change"
    ? t("pages.consensusStatus.slotViewChange")
    : slot.state === "ok"
      ? t("pages.consensusStatus.slotOk")
      : t("pages.consensusStatus.slotUnknown");
  return t("pages.consensusStatus.slotTitle", {
    node: node.name,
    height: formatNumber(slot.height),
    status: statusText,
    actual: slot.actualPrimary === null ? "N/A" : slot.actualPrimary,
  });
}

async function refresh() {
  const network = resolveNetworkName();
  loading.value = true;
  error.value = "";
  try {
    await loadCommittee();
    const [blocks, liveness] = await Promise.all([
      getLatestBlocks(network),
      getLiveness(network),
    ]);
    latestBlocks.value = Array.isArray(blocks) ? blocks : [];
    livenessData.value = liveness || {};
    lastUpdated.value = new Date();
  } catch (err) {
    error.value = err?.message || t("pages.consensusStatus.loadFailed");
  } finally {
    loading.value = false;
  }
}

function handleNetworkChange() {
  latestBlocks.value = [];
  livenessData.value = {};
  lastUpdated.value = null;
  void refresh();
}

useNetworkChange(handleNetworkChange);

onMounted(() => {
  void refresh();
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
