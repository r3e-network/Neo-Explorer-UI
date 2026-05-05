<template>
  <div class="etherscan-card overflow-hidden">
    <div class="card-header">
      <h2 class="text-high text-sm font-semibold">{{ $t("gasTracker.blocksTitle") }}</h2>
      <button
        @click="$emit('refresh')"
        :aria-label="$t('gasTracker.blocksRefreshAria')"
        class="text-xs text-primary-500 hover:text-primary-600 dark:text-primary-400"
      >
        {{ $t("gasTracker.blocksRefresh") }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-2 p-4">
      <Skeleton v-for="i in 6" :key="i" height="44px" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="p-4">
      <ErrorState :title="$t('common.failedToLoad')" :message="error" @retry="$emit('retry')" />
    </div>

    <!-- Empty -->
    <div v-else-if="!blocks.length" class="p-4">
      <EmptyState :message="$t('gasTracker.blocksEmpty')" icon="block" />
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full min-w-[700px]" :aria-label="$t('aria.blockFeesTable')">
        <thead class="table-head">
          <tr>
            <th scope="col" class="table-header-cell">{{ $t("gasTracker.colBlock") }}</th>
            <th scope="col" class="table-header-cell">{{ $t("gasTracker.colAge") }}</th>
            <th scope="col" class="table-header-cell text-center">{{ $t("gasTracker.colTxns") }}</th>
            <th scope="col" class="table-header-cell-right">{{ $t("gasTracker.colAvgFee") }}</th>
            <th scope="col" class="table-header-cell-right">{{ $t("gasTracker.colTotalFees") }}</th>
          </tr>
        </thead>
        <tbody class="soft-divider divide-y">
          <tr
            v-for="block in blocks"
            :key="block.hash"
            class="list-row group"
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
            <td class="table-cell-right">
              {{ formatGas(avgFee(block)) }}
            </td>
            <td class="table-cell-right text-high font-medium">
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
