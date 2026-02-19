<template>
  <div class="etherscan-card overflow-hidden">
    <div class="card-header">
      <h2 class="text-high text-sm font-semibold">Recent Blocks - Fee Data</h2>
      <button
        @click="$emit('refresh')"
        aria-label="Refresh data"
        class="text-xs text-primary-500 hover:text-primary-600 dark:text-primary-400"
      >
        Refresh
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-2 p-4">
      <Skeleton v-for="i in 6" :key="i" height="44px" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="p-4">
      <ErrorState title="Failed to load block fee data" :message="error" @retry="$emit('retry')" />
    </div>

    <!-- Empty -->
    <div v-else-if="!blocks.length" class="p-4">
      <EmptyState message="No block data available" icon="block" />
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full min-w-[700px]">
        <thead class="table-head">
          <tr>
            <th class="table-header-cell">Block</th>
            <th class="table-header-cell">Age</th>
            <th class="table-header-cell text-center">Txns</th>
            <th class="table-header-cell-right">Avg Fee</th>
            <th class="table-header-cell-right">Total Fees</th>
          </tr>
        </thead>
        <tbody class="soft-divider divide-y">
          <tr
            v-for="block in blocks"
            :key="block.hash"
            class="list-row transition-colors"
          >
            <td class="table-cell">
              <router-link :to="`/block-info/${block.hash}`" class="font-medium etherscan-link">
                {{ formatNumber(block.index) }}
              </router-link>
            </td>
            <td class="table-cell-secondary">
              {{ formatAge(block.timestamp) }}
            </td>
            <td class="table-cell text-center">
              {{ block.txcount || 0 }}
            </td>
            <td class="table-cell text-right">
              {{ formatGas(avgFee(block)) }}
            </td>
            <td class="table-cell text-high text-right font-medium">
              {{ formatGas(totalFee(block)) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import { formatNumber, formatAge, formatGas } from "@/utils/explorerFormat";

defineProps({
  blocks: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: null,
  },
});

defineEmits(["refresh", "retry"]);

function totalFee(block) {
  return (Number(block.sysfee) || 0) + (Number(block.netfee) || 0);
}

function avgFee(block) {
  const total = totalFee(block);
  const txCount = Number(block.txcount) || 1;
  return Math.round(total / txCount);
}
</script>
