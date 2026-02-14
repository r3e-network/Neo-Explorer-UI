<template>
  <div v-if="loading" class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
    <Skeleton v-for="i in 3" :key="i" height="120px" variant="rounded" />
  </div>
  <div v-else class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
    <!-- Low Fee -->
    <div class="stat-card">
      <div class="mb-2 flex items-center gap-2">
        <span
          class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <span class="stat-label text-sm normal-case tracking-normal">Low</span>
      </div>
      <p class="stat-value text-2xl">
        {{ formatGas(feeEstimates.low) }}
      </p>
      <p class="mt-1 text-xs text-text-muted dark:text-gray-500">GAS / transaction (slow)</p>
    </div>

    <!-- Average Fee -->
    <div class="stat-card border-primary-200 dark:border-primary-800">
      <div class="mb-2 flex items-center gap-2">
        <span
          class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </span>
        <span class="stat-label text-sm normal-case tracking-normal">Average</span>
      </div>
      <p class="stat-value text-2xl text-primary-600 dark:text-primary-400">
        {{ formatGas(feeEstimates.average) }}
      </p>
      <p class="mt-1 text-xs text-text-muted dark:text-gray-500">GAS / transaction (standard)</p>
    </div>

    <!-- High Fee -->
    <div class="stat-card">
      <div class="mb-2 flex items-center gap-2">
        <span
          class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
            />
          </svg>
        </span>
        <span class="stat-label text-sm normal-case tracking-normal">High</span>
      </div>
      <p class="stat-value text-2xl">
        {{ formatGas(feeEstimates.high) }}
      </p>
      <p class="mt-1 text-xs text-text-muted dark:text-gray-500">GAS / transaction (fast)</p>
    </div>
  </div>
</template>

<script setup>
import Skeleton from "@/components/common/Skeleton.vue";
import { formatGas } from "@/utils/explorerFormat";

defineProps({
  feeEstimates: {
    type: Object,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});
</script>
