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
      <div class="page-header-icon bg-icon-primary">
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
    <div class="flex items-center gap-2" role="group" aria-label="Block navigation">
      <button
        type="button"
        :disabled="block.index == null || block.index <= 0"
        class="panel-muted list-row inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-mid transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Previous block"
        @click="emit('navigate', (block.index ?? 0) - 1)"
      >
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Prev
      </button>
      <button
        type="button"
        :disabled="block.index == null || block.index >= latestBlockHeight"
        class="panel-muted list-row inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-mid transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:opacity-40"
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
