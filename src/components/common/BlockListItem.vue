<template>
  <div class="list-row border-b px-4 py-3">
    <div class="flex items-center justify-between gap-4">
      <div class="flex min-w-0 items-center gap-3">
        <!-- Block circle icon -->
        <div
          class="bg-icon-primary text-primary-500 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
        >
          Bk
        </div>
        <div class="min-w-0">
          <router-link
            :to="`/block-info/${block.hash}`"
            :title="block.hash"
            class="etherscan-link font-medium transition-colors"
          >
            #{{ formatNumber(block.index || 0) }}
          </router-link>
          <p class="mt-0.5 text-xs text-mid">
            {{ formatAge(block.timestamp) }}
          </p>
        </div>
      </div>

      <!-- Block Size (hidden on mobile) -->
      <div class="hidden min-w-0 flex-1 text-center md:block">
        <p class="text-xs text-mid">Block Size</p>
        <p class="text-sm font-medium text-high">{{ formatNumber(block.size || 0) }} bytes</p>
      </div>

      <!-- Tx count -->
      <div class="flex-shrink-0 text-right">
        <p class="text-sm text-high">
          <span class="font-medium">{{ formatNumber(block.transactioncount || block.txcount || 0) }}</span>
          txns
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useNow } from "@vueuse/core";
import { formatAge as _formatAge, formatNumber } from "@/utils/explorerFormat";

defineProps({
  block: { type: Object, default: () => ({}) },
});

const now = useNow({ interval: 1000 });
const formatAge = (ts) => _formatAge(ts, now.value.getTime());
</script>
