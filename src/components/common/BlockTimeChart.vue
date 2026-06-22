<template>
  <div class="etherscan-card overflow-hidden" :data-testid="testId">
    <div class="card-header">
      <div>
        <h2 class="text-high text-base font-semibold">{{ title || t("pages.networkStatus.blockTimeTitle") }}</h2>
        <p class="text-low mt-1 text-xs">{{ subtitle || t("pages.networkStatus.blockTimeSubtitle") }}</p>
      </div>
    </div>
    <div v-if="loading && normalizedBlocks.length === 0" class="space-y-2 p-4">
      <Skeleton v-for="i in 8" :key="i" height="20px" />
    </div>
    <div v-else-if="!loading && normalizedBlocks.length === 0" class="p-6">
      <EmptyState :message="emptyMessage || t('pages.networkStatus.noData')" />
    </div>
    <div v-else class="p-4">
      <div class="flex h-36 items-end gap-[2px] pt-8" :aria-label="title || t('pages.networkStatus.blockTimeTitle')">
        <button
          v-for="(b, index) in normalizedBlocks"
          :key="b.height"
          type="button"
          class="relative min-h-[7px] flex-1 appearance-none rounded-t-sm border-0 p-0 transition-[height,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
          :class="blockBarClass(b)"
          :style="{ height: blockBarHeight(b) }"
          :aria-label="blockAriaLabel(b)"
          @mouseenter="hoveredBlockHeight = b.height"
          @mouseleave="hoveredBlockHeight = null"
          @focus="focusedBlockHeight = b.height"
          @blur="focusedBlockHeight = null"
          @click="togglePinnedBlock(b)"
        >
          <span
            v-if="isBlockActive(b)"
            class="pointer-events-none absolute bottom-[calc(100%+0.5rem)] z-30 w-max max-w-[260px] rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs leading-relaxed text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            :class="blockTooltipPositionClass(index)"
            role="tooltip"
          >
            <span class="block font-semibold text-high">#{{ formatNumber(b.height) }}</span>
            <span class="mt-1 block">
              {{ t("pages.networkStatus.blockInterval") }}:
              <span class="font-medium text-high">{{ formatSeconds(b.interval) }}</span>
            </span>
            <span class="block">
              {{ t("pages.networkStatus.consensusNode") }}:
              <span class="font-medium text-high">{{ consensusNodeName(b) }}</span>
            </span>
            <span class="block">
              {{ t("pages.networkStatus.primaryIndex") }}:
              <span class="font-medium text-high">{{ primaryNodeDisplay(b) }}</span>
            </span>
            <span class="block">
              {{ t("pages.networkStatus.blockTxs") }}:
              <span class="font-medium text-high">{{ formatNumber(Number(b.tx) || 0) }}</span>
            </span>
          </span>
        </button>
      </div>
      <div class="text-low mt-2 flex justify-between text-[10px] font-mono">
        <span>#{{ formatNumber(normalizedBlocks[0]?.height) }}</span>
        <span>#{{ formatNumber(normalizedBlocks[normalizedBlocks.length - 1]?.height) }}</span>
      </div>
      <div
        v-if="inspectedBlock"
        class="soft-divider mt-3 grid gap-3 border-t pt-3 text-xs sm:grid-cols-2 lg:grid-cols-4"
      >
        <div>
          <div class="text-low font-semibold uppercase tracking-wider">
            {{ t("pages.networkStatus.inspectedBlock") }}
          </div>
          <div class="mt-1 font-mono text-sm font-semibold text-high">#{{ formatNumber(inspectedBlock.height) }}</div>
        </div>
        <div>
          <div class="text-low font-semibold uppercase tracking-wider">
            {{ t("pages.networkStatus.blockInterval") }}
          </div>
          <div class="mt-1 text-sm font-semibold text-high">{{ formatSeconds(inspectedBlock.interval) }}</div>
        </div>
        <div>
          <div class="text-low font-semibold uppercase tracking-wider">
            {{ t("pages.networkStatus.consensusNode") }}
          </div>
          <div class="mt-1 text-sm font-semibold text-high">{{ consensusNodeName(inspectedBlock) }}</div>
        </div>
        <div>
          <div class="text-low font-semibold uppercase tracking-wider">
            {{ t("pages.networkStatus.primaryIndex") }}
          </div>
          <div class="mt-1 text-sm font-semibold text-high">{{ primaryNodeDisplay(inspectedBlock) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import { useCommittee } from "@/composables/useCommittee";
import { formatNumber } from "@/utils/explorerFormat";

const props = defineProps({
  blocks: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  emptyMessage: { type: String, default: "" },
  testId: { type: String, default: "block-time-chart" },
});

const { t } = useI18n();
const { getPrimaryNodeName } = useCommittee();

const hoveredBlockHeight = ref(null);
const focusedBlockHeight = ref(null);
const pinnedBlockHeight = ref(null);

const HIGH_LATENCY_SECONDS = 5;
const SEVERE_LATENCY_SECONDS = 8;
const MIN_INTERVAL_SECONDS = 0.5;
const INTEGER_INTERVAL_EPSILON_SECONDS = 0.01;

function normalizeInterval(value) {
  const interval = Number(value);
  if (!Number.isFinite(interval) || interval < MIN_INTERVAL_SECONDS) return null;

  const rounded = Math.round(interval);
  if (Math.abs(interval - rounded) <= INTEGER_INTERVAL_EPSILON_SECONDS) return rounded;
  return Number(interval.toFixed(2));
}

function normalizeBlock(block = {}) {
  const height = Number(block.height ?? block.index ?? block.block_index ?? block.blockindex);
  const rawInterval = block.interval ?? block.blockInterval ?? block.block_interval;
  const txSource = Array.isArray(block.tx)
    ? block.tx.length
    : block.tx ?? block.txcount ?? block.transactioncount ?? block.tx_count ?? block.transaction_count ?? 0;
  const tx = Number(txSource);
  return {
    ...block,
    height: Number.isFinite(height) ? height : 0,
    interval: normalizeInterval(rawInterval),
    tx: Number.isFinite(tx) ? tx : 0,
  };
}

const normalizedBlocks = computed(() =>
  (Array.isArray(props.blocks) ? props.blocks : [])
    .map(normalizeBlock)
    .filter((block) => block.height > 0 && Number(block.interval) > 0)
);

const maxInterval = computed(() => normalizedBlocks.value.reduce((m, b) => Math.max(m, b.interval || 0), 0));

const activeBlockHeight = computed(() => hoveredBlockHeight.value ?? focusedBlockHeight.value ?? pinnedBlockHeight.value);

const slowestBlock = computed(() => {
  if (!normalizedBlocks.value.length) return null;
  return normalizedBlocks.value.reduce((slowest, block) => {
    if (!slowest) return block;
    return Number(block.interval || 0) > Number(slowest.interval || 0) ? block : slowest;
  }, null);
});

const inspectedBlock = computed(() => {
  const height = activeBlockHeight.value;
  if (height !== null && height !== undefined) {
    const found = normalizedBlocks.value.find((block) => block.height === height);
    if (found) return found;
  }
  return slowestBlock.value;
});

function formatSeconds(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return "N/A";
  return `${seconds.toFixed(seconds % 1 === 0 ? 0 : 2)}s`;
}

function primaryNodeIndex(block) {
  const candidates = [block?.primaryNode, block?.primary_node, block?.primary];
  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric) && numeric >= 0) return numeric;
  }
  return null;
}

function consensusNodeName(block) {
  const primary = primaryNodeIndex(block);
  if (primary === null) return t("pages.networkStatus.unknownConsensusNode");
  return getPrimaryNodeName(primary, block?.nextConsensus || block?.next_consensus || block?.nextconsensus) || t("pages.networkStatus.unknownConsensusNode");
}

function primaryNodeDisplay(block) {
  const primary = primaryNodeIndex(block);
  return primary === null ? "N/A" : String(primary);
}

function blockBarHeight(block) {
  const denominator = Math.max(maxInterval.value, 1);
  const height = Math.min(100, (Number(block?.interval || 0) / denominator) * 100);
  return `${Math.max(5, height)}%`;
}

function blockBarClass(block) {
  const interval = Number(block?.interval) || 0;
  if (isBlockActive(block)) return "bg-primary-500 shadow-[0_0_0_2px_rgba(14,165,233,0.28)]";
  if (interval >= SEVERE_LATENCY_SECONDS) return "bg-red-500/80 hover:bg-red-500";
  if (interval >= HIGH_LATENCY_SECONDS) return "bg-amber-400/80 hover:bg-amber-400";
  return "bg-emerald-500/75 hover:bg-emerald-500";
}

function blockAriaLabel(block) {
  return [
    `#${formatNumber(block?.height)}`,
    `${t("pages.networkStatus.blockInterval")} ${formatSeconds(block?.interval)}`,
    `${t("pages.networkStatus.consensusNode")} ${consensusNodeName(block)}`,
    `${t("pages.networkStatus.primaryIndex")} ${primaryNodeDisplay(block)}`,
    `${t("pages.networkStatus.blockTxs")} ${formatNumber(Number(block?.tx) || 0)}`,
  ].join(", ");
}

function isBlockActive(block) {
  return activeBlockHeight.value !== null && activeBlockHeight.value !== undefined && block?.height === activeBlockHeight.value;
}

function togglePinnedBlock(block) {
  pinnedBlockHeight.value = pinnedBlockHeight.value === block?.height ? null : block?.height;
}

function blockTooltipPositionClass(index) {
  if (index < 8) return "left-0";
  if (index > normalizedBlocks.value.length - 9) return "right-0";
  return "left-1/2 -translate-x-1/2";
}
</script>
