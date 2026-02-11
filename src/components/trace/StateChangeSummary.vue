<template>
  <div class="state-change-summary">
    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Skeleton v-for="i in 4" :key="i" width="100%" height="72px" variant="rounded" />
    </div>

    <!-- Stats grid (only when data available) -->
    <div v-else-if="enrichedTrace" class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <!-- Contracts -->
      <div
        class="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
      >
        <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
          <svg class="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <div class="min-w-0">
          <p class="text-lg font-bold text-gray-900 dark:text-white leading-tight">{{ contractCount }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Contracts</p>
        </div>
      </div>

      <!-- Transfers -->
      <div
        class="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
      >
        <div
          class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40"
        >
          <svg class="h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        </div>
        <div class="min-w-0">
          <p class="text-lg font-bold text-gray-900 dark:text-white leading-tight">{{ transferCount }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Transfers</p>
        </div>
      </div>

      <!-- Events -->
      <div
        class="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
      >
        <div
          class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/40"
        >
          <svg class="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
        <div class="min-w-0">
          <p class="text-lg font-bold text-gray-900 dark:text-white leading-tight">{{ eventCount }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Events</p>
        </div>
      </div>

      <!-- Gas -->
      <div
        class="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
      >
        <div
          class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40"
        >
          <svg class="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
            />
          </svg>
        </div>
        <div class="min-w-0">
          <p class="text-lg font-bold text-gray-900 dark:text-white leading-tight">{{ formattedGas }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">GAS Used</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import Skeleton from "@/components/common/Skeleton.vue";
import { formatGasDecimal } from "@/utils/explorerFormat";

const props = defineProps({
  enrichedTrace: { type: Object, default: null },
  loading: { type: Boolean, default: false },
});

const contractCount = computed(() => {
  if (!props.enrichedTrace?.executions) return 0;
  const hashes = new Set();
  for (const exec of props.enrichedTrace.executions) {
    for (const op of exec.operations ?? []) {
      hashes.add(op.contract);
    }
  }
  return hashes.size;
});

const transferCount = computed(() => {
  return props.enrichedTrace?.transfers?.length ?? 0;
});

const eventCount = computed(() => {
  if (!props.enrichedTrace?.executions) return 0;
  return props.enrichedTrace.executions.reduce((sum, e) => sum + (e.operations?.length ?? 0), 0);
});

const formattedGas = computed(() => {
  if (!props.enrichedTrace?.executions) return "0";
  const total = props.enrichedTrace.executions.reduce((sum, e) => sum + Number(e.gasConsumed || 0), 0);
  return formatGasDecimal(total, 4);
});
</script>
