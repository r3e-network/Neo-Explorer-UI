<template>
  <div class="gas-breakdown">
    <!-- Loading -->
    <div v-if="loading" aria-live="polite" class="space-y-3">
      <Skeleton width="100%" height="20px" />
      <Skeleton width="100%" height="32px" variant="rounded" />
      <Skeleton v-for="i in 3" :key="i" width="80%" height="16px" />
    </div>

    <!-- Empty -->
    <div
      v-else-if="!contractGasData || contractGasData.length === 0"
      class="text-mid py-6 text-center text-sm"
    >
      No gas data available
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-high text-sm font-semibold">
          Gas Distribution (estimated)<span class="text-low ml-2 text-xs font-normal"
            >Gas estimated by operation count</span
          >
        </h3>
        <span class="text-mid text-sm font-mono font-medium"> {{ formattedTotal }} GAS </span>
      </div>

      <!-- Stacked bar -->
      <div class="soft-divider mb-4 flex h-6 w-full overflow-hidden rounded-full border">
        <div
          v-for="(item, idx) in contractGasData"
          :key="idx"
          class="h-full transition-all duration-300"
          :class="barColorClass(idx)"
          :style="{ width: item.percentage + '%' }"
          :title="`${item.name}: ${item.percentage.toFixed(1)}%`"
        />
      </div>

      <!-- Legend list -->
      <div class="space-y-2">
        <div
          v-for="(item, idx) in contractGasData"
          :key="'legend-' + idx"
          class="flex items-center justify-between text-sm"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-3 h-3 rounded-full flex-shrink-0" :class="barColorClass(idx)" />
            <span class="text-high truncate">
              {{ item.name }}
            </span>
          </div>
          <div class="flex items-center gap-3 flex-shrink-0 ml-2">
            <span class="text-mid font-mono text-xs"> {{ item.gasFormatted }} GAS </span>
            <span class="text-high w-14 text-right font-mono text-xs font-medium">
              {{ item.percentage.toFixed(1) }}%
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import Skeleton from "@/components/common/Skeleton.vue";
import { formatGasDecimal, truncateHash } from "@/utils/explorerFormat";

const props = defineProps({
  executions: {
    type: Array,
    default: () => [],
    validator: (val) => val.every((e) => e !== null && typeof e === "object"),
  },
  totalGas: {
    type: String,
    default: "0",
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const SEGMENT_COLORS = ["emerald", "blue", "purple", "amber", "rose", "cyan"];

const barColors = {
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  cyan: "bg-cyan-500",
};

const formattedTotal = computed(() => formatGasDecimal(props.totalGas, 4));

const contractGasData = computed(() => {
  if (!props.executions || props.executions.length === 0) return [];

  // Count operations per contract across all executions
  const contractOps = new Map();
  let totalOps = 0;

  for (const exec of props.executions) {
    if (!exec) continue;
    for (const op of exec.operations ?? []) {
      const hash = op.contract ?? "unknown";
      const name = op.contractName || truncateHash(hash);
      if (!contractOps.has(hash)) {
        contractOps.set(hash, { hash, name, count: 0 });
      }
      contractOps.get(hash).count++;
      totalOps++;
    }
  }

  if (totalOps === 0) return [];

  const totalGasNum = Number(props.totalGas) || 0;
  const entries = Array.from(contractOps.values())
    .sort((a, b) => b.count - a.count)
    .map((entry) => {
      const ratio = entry.count / totalOps;
      const gasShare = totalGasNum * ratio;
      return {
        name: entry.name,
        hash: entry.hash,
        count: entry.count,
        percentage: ratio * 100,
        gasFormatted: formatGasDecimal(gasShare, 4),
      };
    });

  return entries;
});

function barColorClass(idx) {
  return barColors[SEGMENT_COLORS[idx % SEGMENT_COLORS.length]];
}
</script>
