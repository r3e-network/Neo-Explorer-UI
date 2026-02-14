<script setup>
import { formatNumber } from "@/utils/explorerFormat";

defineProps({
  block: { type: Object, required: true },
  loading: { type: Boolean, default: false },
  latestBlockHeight: { type: Number, default: Infinity },
  timeAgo: { type: String, default: "" },
});

const emit = defineEmits(["navigate"]);
</script>

<template>
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-center gap-3">
      <div class="page-header-icon bg-primary-100 dark:bg-primary-900/40">
        <svg class="h-6 w-6 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
        </svg>
      </div>
      <div>
        <h1 class="page-title">Block #{{ formatNumber(block.index ?? 0) }}</h1>
        <p v-if="!loading" class="page-subtitle">{{ timeAgo }}</p>
      </div>
    </div>
    <!-- Prev / Next Navigation -->
    <div class="flex items-center gap-2">
      <button
        :disabled="block.index == null || block.index <= 0"
        class="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        aria-label="Previous block"
        @click="emit('navigate', (block.index ?? 0) - 1)"
      >
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Prev
      </button>
      <button
        :disabled="block.index == null || block.index >= latestBlockHeight"
        class="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        aria-label="Next block"
        @click="emit('navigate', (block.index ?? 0) + 1)"
      >
        Next
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>
</template>
