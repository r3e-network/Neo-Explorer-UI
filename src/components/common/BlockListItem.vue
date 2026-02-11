<template>
  <div
    class="border-b border-card-border px-4 py-3 transition-colors hover:bg-gray-50 dark:border-card-border-dark dark:hover:bg-gray-800/60"
  >
    <div class="flex items-center justify-between gap-4">
      <div class="flex min-w-0 items-center gap-3">
        <!-- Block circle icon -->
        <div
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-text-secondary dark:bg-gray-800 dark:text-gray-400"
        >
          Bk
        </div>
        <div class="min-w-0">
          <router-link
            :to="`/block-info/${block.hash}`"
            :title="block.hash"
            class="font-medium text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
          >
            #{{ formatNumber(block.index || 0) }}
          </router-link>
          <p class="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
            {{ formatAge(block.timestamp) }}
          </p>
        </div>
      </div>

      <!-- Validator / Fee Recipient (hidden on mobile) -->
      <div class="hidden min-w-0 flex-1 text-center md:block">
        <p class="text-xs text-text-secondary dark:text-gray-400">Fee Recipient</p>
        <HashLink v-if="block.speaker" :hash="block.speaker" type="address" :copyable="false" />
        <span v-else class="text-sm text-text-muted dark:text-gray-500">-</span>
      </div>

      <!-- Tx count + reward -->
      <div class="flex-shrink-0 text-right">
        <p class="text-sm text-text-primary dark:text-gray-300">
          <span class="font-medium">{{ block.txcount || 0 }}</span>
          txns
        </p>
        <p class="mt-0.5 text-xs text-text-secondary dark:text-gray-400">{{ formatGas(block.netfee, 4) }} GAS</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatAge, formatGas, formatNumber } from "@/utils/explorerFormat";
import HashLink from "./HashLink.vue";

defineProps({
  block: { type: Object, default: () => ({}) },
});
</script>
